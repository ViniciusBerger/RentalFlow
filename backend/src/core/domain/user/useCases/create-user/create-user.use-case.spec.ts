import { CreateUserUseCase } from "../create-user/create-user.use-case";
import { IUserRepository } from "src/core/app/ports/IUserRepository";

describe("CreateUserUseCase", () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new CreateUserUseCase(userRepository);
  });

  it("should call userRepository.create with the provided arguments", async () => {
    userRepository.create.mockResolvedValue(true);

    const result = await useCase.createUser(
      "user-123",
      "John",
      "Doe",
      "john@example.com",
      "admin"
    );

    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(userRepository.create).toHaveBeenCalledWith(
      "user-123",
      "John",
      "Doe",
      "john@example.com",
      "admin"
    );
    expect(result).toBe(true);
  });

  it("should return the value returned by userRepository.create", async () => {
    const createdUser = {
      id: "user-123",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      role: "admin",
    };

    userRepository.create.mockResolvedValue(createdUser as any);

    const result = await useCase.createUser(
      "user-123",
      "John",
      "Doe",
      "john@example.com",
      "admin"
    );

    expect(result).toEqual(createdUser);
  });

  it("should propagate errors thrown by userRepository.create", async () => {
    userRepository.create.mockRejectedValue(new Error("create failed"));

    await expect(
      useCase.createUser(
        "user-123",
        "John",
        "Doe",
        "john@example.com",
        "admin"
      )
    ).rejects.toThrow("create failed");
  });

  it("should pass empty strings if provided", async () => {
    userRepository.create.mockResolvedValue(false);

    const result = await useCase.createUser("", "", "", "", "");

    expect(userRepository.create).toHaveBeenCalledWith("", "", "", "", "");
    expect(result).toBe(false);
  });
});