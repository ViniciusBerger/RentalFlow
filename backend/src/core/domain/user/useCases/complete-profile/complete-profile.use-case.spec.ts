import { CompleteProfileUseCase } from "../complete-profile/complete-profile.use-case";
import { IUserRepository } from "src/core/app/ports/IUserRepository";

describe("CompleteProfileUseCase", () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let useCase: CompleteProfileUseCase;

  beforeEach(() => {
    userRepository = {
      select: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new CompleteProfileUseCase(userRepository);
  });

  it("should create a user when no existing user is found", async () => {
    userRepository.select.mockResolvedValue(null as any);
    userRepository.create.mockResolvedValue(true);

    const result = await useCase.execute(
      "firebase-123",
      "test@example.com",
      "John",
      "Doe"
    );

    expect(userRepository.select).toHaveBeenCalledWith("firebase-123");
    expect(userRepository.create).toHaveBeenCalledWith(
      "firebase-123",
      "test@example.com",
      "John",
      "Doe"
    );
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should update firstName and lastName when user already exists", async () => {
    userRepository.select.mockResolvedValue({
      firebaseUid: "firebase-123",
      email: "old@example.com",
      firstName: "Old",
      lastName: "Name",
    } as any);
    userRepository.update.mockResolvedValue(true);

    const result = await useCase.execute(
      "firebase-123",
      "test@example.com",
      "Jane",
      "Smith"
    );

    expect(userRepository.select).toHaveBeenCalledWith("firebase-123");
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith("firebase-123", {
      firstName: "Jane",
      lastName: "Smith",
    });
    expect(result).toBe(true);
  });

  it("should return false when create fails", async () => {
    userRepository.select.mockResolvedValue(null as any);
    userRepository.create.mockResolvedValue(false);

    const result = await useCase.execute(
      "firebase-123",
      "test@example.com",
      "John",
      "Doe"
    );

    expect(result).toBe(false);
    expect(userRepository.create).toHaveBeenCalledTimes(1);
  });

  it("should return false when update fails", async () => {
    userRepository.select.mockResolvedValue({
      firebaseUid: "firebase-123",
    } as any);
    userRepository.update.mockResolvedValue(false);

    const result = await useCase.execute(
      "firebase-123",
      "test@example.com",
      "Jane",
      "Smith"
    );

    expect(result).toBe(false);
    expect(userRepository.update).toHaveBeenCalledTimes(1);
  });

  it("should propagate repository errors from select", async () => {
    userRepository.select.mockRejectedValue(new Error("select failed"));

    await expect(
      useCase.execute("firebase-123", "test@example.com", "John", "Doe")
    ).rejects.toThrow("select failed");
  });

  it("should propagate repository errors from create", async () => {
    userRepository.select.mockResolvedValue(null as any);
    userRepository.create.mockRejectedValue(new Error("create failed"));

    await expect(
      useCase.execute("firebase-123", "test@example.com", "John", "Doe")
    ).rejects.toThrow("create failed");
  });

  it("should propagate repository errors from update", async () => {
    userRepository.select.mockResolvedValue({
      firebaseUid: "firebase-123",
    } as any);
    userRepository.update.mockRejectedValue(new Error("update failed"));

    await expect(
      useCase.execute("firebase-123", "test@example.com", "Jane", "Smith")
    ).rejects.toThrow("update failed");
  });
});