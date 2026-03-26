import { DeleteUserUseCase } from "../delete-user/delete-user.use-case";
import { IUserRepository } from "src/core/app/ports/IUserRepository";

describe("DeleteUserUseCase", () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let useCase: DeleteUserUseCase;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new DeleteUserUseCase(userRepository);
  });

  it("should call userRepository.delete with the provided userId", async () => {
    userRepository.delete.mockResolvedValue(true);

    const result = await useCase.deleteUser("user-123");

    expect(userRepository.delete).toHaveBeenCalledTimes(1);
    expect(userRepository.delete).toHaveBeenCalledWith("user-123");
    expect(result).toBe(true);
  });

  it("should return false when userRepository.delete returns false", async () => {
    userRepository.delete.mockResolvedValue(false);

    const result = await useCase.deleteUser("user-123");

    expect(userRepository.delete).toHaveBeenCalledWith("user-123");
    expect(result).toBe(false);
  });

  it("should propagate errors thrown by userRepository.delete", async () => {
    userRepository.delete.mockRejectedValue(new Error("delete failed"));

    await expect(useCase.deleteUser("user-123")).rejects.toThrow("delete failed");
  });

  it("should pass empty string if provided", async () => {
    userRepository.delete.mockResolvedValue(false);

    const result = await useCase.deleteUser("");

    expect(userRepository.delete).toHaveBeenCalledWith("");
    expect(result).toBe(false);
  });
});