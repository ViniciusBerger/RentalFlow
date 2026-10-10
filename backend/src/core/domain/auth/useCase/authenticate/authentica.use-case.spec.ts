import { AuthenticateUseCase } from '../../useCase/authenticate/authenticate.use-case';
import { IAuthPort, AuthUserResponse } from '../../../../app/ports/IAuthPort';

describe('AuthenticateUseCase', () => {
  let useCase: AuthenticateUseCase;
  let authPortMock: jest.Mocked<IAuthPort>;

  beforeEach(() => {
    // Create a mock implementation of the Port
    authPortMock = {
      authenticate: jest.fn(),
      validateJWT: jest.fn(), // We won't use this here, but the interface needs it
    } as any;

    useCase = new AuthenticateUseCase(authPortMock);
  });

  it('should return user data and token when credentials are valid', async () => {
    // Arrange
    const mockResponse: AuthUserResponse = {
      idToken: 'valid-token',
      uid: 'user-123',
      email: 'test@example.com',
    };
    
    authPortMock.authenticate.mockResolvedValue(mockResponse);

    const credentials = { email: 'test@example.com', password: 'password123' };

    // Act
    const result = await useCase.authenticate(credentials);

    // Assert
    expect(result).toEqual(mockResponse);
    expect(authPortMock.authenticate).toHaveBeenCalledWith(
      credentials.email,
      credentials.password,
    );
  });

  it('delegates authentication without logging private credentials', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const response: AuthUserResponse = { idToken: 'token', uid: 'user-x', email: 'host@example.com' };
    authPortMock.authenticate.mockResolvedValue(response);
    try {
      expect(await useCase.authenticate({email: 'host@example.com', password: 'unique-secret'})).toEqual(response);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });

  it('should throw an error if the authPort fails', async () => {
    // Arrange
    authPortMock.authenticate.mockRejectedValue(new Error('Invalid credentials'));

    const credentials = { email: 'wrong@example.com', password: 'wrong-password' };

    // Act & Assert
    await expect(useCase.authenticate(credentials)).rejects.toThrow('Invalid credentials');
  });
});