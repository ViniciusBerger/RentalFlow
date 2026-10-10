import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthAdapter } from './firebase-auth.adapter';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { CreateUserUseCase } from '../../../core/domain/user/useCases/create-user/create-user.use-case';
import { NewUserUseCase } from '../../../core/domain/user/useCases/new-user-process/new-user.use-case';

jest.mock('axios');
jest.mock('firebase-admin', () => ({ auth: jest.fn() }));
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FirebaseAuthAdapter', () => {
  let adapter: FirebaseAuthAdapter;
  let firebaseAuthMock: any;
  const mockApiKey = 'fake-api-key';

  const createUserUseCaseMock = {
    execute: jest.fn(),
    createUser: jest.fn(),
  };

  const newUserUseCaseMock = {
    verifyUser: jest.fn(),
  };

  beforeEach(async () => {
    firebaseAuthMock = {
      verifyIdToken: jest.fn(),
    };

    jest.clearAllMocks();

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
        {
          provide: CreateUserUseCase,
          useValue: createUserUseCaseMock,
        },
        {
          provide: NewUserUseCase,
          useValue: newUserUseCaseMock,
        },
      ],
    }).compile();

    adapter = module.get<FirebaseAuthAdapter>(FirebaseAuthAdapter);
  });

  describe('validateJWT', () => {
    it('should return AuthStatus when token is valid and registered', async () => {
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
      };

      firebaseAuthMock.verifyIdToken.mockResolvedValue(mockDecodedToken);
      newUserUseCaseMock.verifyUser.mockResolvedValue({
        success: true,
        user: { role: 'user' },
      });

      const result = await adapter.validateJWT('valid-token');

      expect(result).toEqual({
        uid: 'user-123',
        email: 'test@example.com',
        role: 'user',
        isRegistered: true,
      });
      expect(firebaseAuthMock.verifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(newUserUseCaseMock.verifyUser).toHaveBeenCalledWith('user-123');
    });

    it('should return authenticated but unregistered user status', async () => {
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
      };

      firebaseAuthMock.verifyIdToken.mockResolvedValue(mockDecodedToken);
      newUserUseCaseMock.verifyUser.mockResolvedValue({
        success: false,
        user: null,
      });

      const result = await adapter.validateJWT('valid-token');

      expect(result).toEqual({
        uid: 'user-123',
        email: 'test@example.com',
        role: undefined,
        isRegistered: false,
      });
    });

    it('should throw UnauthorizedException if email is missing in token', async () => {
      firebaseAuthMock.verifyIdToken.mockResolvedValue({ uid: 'user-123' });

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

  it('handles registered users whose profile has no role yet', async () => {
    firebaseAuthMock.verifyIdToken.mockResolvedValue({ uid: 'u-1', email: 'test@test.com' });
    newUserUseCaseMock.verifyUser.mockResolvedValue({ success: true });
    await expect(adapter.validateJWT('token')).resolves.toEqual({ uid: 'u-1', email: 'test@test.com', role: undefined, isRegistered: true });
  });
  it('does not swallow structured Firebase REST authentication errors', async () => {
    const error = { response: { data: {error: {message:'INVALID_PASSWORD'}} } };
    mockedAxios.post.mockRejectedValue(error);
    const spy=jest.spyOn(console,'log').mockImplementation(()=>undefined);
    await expect(adapter.authenticate('a','b')).rejects.toBe(error);
    expect(spy).toHaveBeenCalledWith('FIREBASE AUTH ERROR:',error.response.data);
    spy.mockRestore();
  });
  it('handles unstructured REST failures without replacing the original error', async () => {
    mockedAxios.post.mockRejectedValue(null);
    const spy=jest.spyOn(console,'log').mockImplementation(()=>undefined);
    await expect(adapter.authenticate('a','b')).rejects.toBeNull();
    spy.mockRestore();
  });
  it('revokes refresh tokens when logging out from Firebase', async () => {
    const revokeRefreshTokens = jest.fn().mockResolvedValue(undefined);
    (admin.auth as jest.Mock).mockReturnValue({ revokeRefreshTokens });
    await expect(adapter.logout('u-1')).resolves.toBeUndefined();
    expect(revokeRefreshTokens).toHaveBeenCalledWith('u-1');
  });
  it('propagates token revocation failures to the caller', async () => {
    (admin.auth as jest.Mock).mockReturnValue({ revokeRefreshTokens: jest.fn().mockRejectedValue(new Error('Firebase unavailable')) });
    await expect(adapter.logout('u-1')).rejects.toThrow('Firebase unavailable');
  });

});