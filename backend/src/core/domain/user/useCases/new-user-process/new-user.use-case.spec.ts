import { NewUserUseCase } from "../new-user-process/new-user.use-case";
import { IUserRepository } from "src/core/app/ports/IUserRepository";

describe("NewUserUseCase", () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let useCase: NewUserUseCase;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new NewUserUseCase(userRepository);
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should return success false when user does not exist", async () => {
    userRepository.select.mockResolvedValue(null as any);

    const result = await useCase.verifyUser("firebase-123");

    expect(userRepository.select).toHaveBeenCalledTimes(1);
    expect(userRepository.select).toHaveBeenCalledWith("firebase-123");
    expect(result).toEqual({ success: false });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should return success true with user when user exists", async () => {
    const user = {
      firebaseUid: "firebase-123",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    };

    userRepository.select.mockResolvedValue(user as any);

    const result = await useCase.verifyUser("firebase-123");

    expect(userRepository.select).toHaveBeenCalledWith("firebase-123");
    expect(result).toEqual({
      success: true,
      user,
    });
  });

  it("should log user details when user exists", async () => {
    const user = {
      firebaseUid: "firebase-123",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    };

    userRepository.select.mockResolvedValue(user as any);

    await useCase.verifyUser("firebase-123");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "USER=>> Jane Smith  EMAIL:jane@example.com"
    );
  });

  it("should propagate errors thrown by userRepository.select", async () => {
    userRepository.select.mockRejectedValue(new Error("select failed"));

    await expect(useCase.verifyUser("firebase-123")).rejects.toThrow(
      "select failed"
    );
  });

  it("should handle empty firebaseUid", async () => {
    userRepository.select.mockResolvedValue(null as any);

    const result = await useCase.verifyUser("");

    expect(userRepository.select).toHaveBeenCalledWith("");
    expect(result).toEqual({ success: false });
  });
});