import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthAdapter } from './firebase-auth.adapter';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

// Mocking axios to prevent real HTTP calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FirebaseAuthAdapter', () => {
    let adapter: FirebaseAuthAdapter;
    let firebaseAuthMock: any;
    const mockApiKey = 'fake-api-key';

    beforeEach(async () => {
        firebaseAuthMock = {
        verifyIdToken: jest.fn(), // Create a mock for Firebase Admin Auth
        };

        const module: TestingModule = await Test.createTestingModule({
        providers: [
            FirebaseAuthAdapter,
            {
            provide: 'FIREBASE_AUTH',
            useValue: firebaseAuthMock,
            },
            {
            provide: 'FIREBASE_API_KEY',
            useValue: mockApiKey,
            },
        ],
        }).compile();

        adapter = module.get<FirebaseAuthAdapter>(FirebaseAuthAdapter);
    });

    describe('validateJWT', () => {
        it('should return AuthStatus when token is valid', async () => {
        const mockDecodedToken = {
            uid: 'user-123',
            email: 'test@example.com',
        };
        firebaseAuthMock.verifyIdToken.mockResolvedValue(mockDecodedToken);

        const result = await adapter.validateJWT('valid-token');

        expect(result).toEqual({
            uid: 'user-123',
            email: 'test@example.com',
        });
        expect(firebaseAuthMock.verifyIdToken).toHaveBeenCalledWith('valid-token');
        });

        it('should throw UnauthorizedException if email is missing in token', async () => {
        firebaseAuthMock.verifyIdToken.mockResolvedValue({ uid: 'user-123' }); // No email

        await expect(adapter.validateJWT('token-no-email'))
            .rejects.toThrow(UnauthorizedException);
        });

        it('should throw if Firebase SDK fails to verify', async () => {
        firebaseAuthMock.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

        await expect(adapter.validateJWT('bad-token')).rejects.toThrow();
        });
    });

    describe('authenticate', () => {
        it('should return AuthUserResponse on successful login', async () => {
        const mockAxiosResponse = {
            data: {
            idToken: 'jwt-token',
            localId: 'user-123',
            email: 'test@example.com',
            },
        };
        mockedAxios.post.mockResolvedValue(mockAxiosResponse);

        const result = await adapter.authenticate('test@test.com', 'password123');

        expect(result).toEqual({
            idToken: 'jwt-token',
            uid: 'user-123',
            email: 'test@example.com',
        });
        // Verify URL contains the API key
        expect(mockedAxios.post).toHaveBeenCalledWith(
            expect.stringContaining(mockApiKey),
            expect.any(Object),
        );
        });

        it('should propagate errors from the Firebase REST API', async () => {
        mockedAxios.post.mockRejectedValue(new Error('INVALID_PASSWORD'));

        await expect(adapter.authenticate('test@test.com', 'wrong-pass'))
            .rejects.toThrow('INVALID_PASSWORD');
        });
    });
});