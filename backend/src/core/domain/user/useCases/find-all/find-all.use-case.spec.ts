import { findAllUsersUseCase } from "../find-all/find-all.use-case";
import { IUserRepository } from "src/core/app/ports/IUserRepository";

describe("findAllUsersUseCase", () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let useCase: findAllUsersUseCase;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new findAllUsersUseCase(userRepository);
  });

  it("should call userRepository.findAll", async () => {
    userRepository.findAll.mockResolvedValue([]);

    const result = await useCase.findUsers();

    expect(userRepository.findAll).toHaveBeenCalledTimes(1);
    expect(userRepository.findAll).toHaveBeenCalledWith();
    expect(result).toEqual([]);
  });

  it("should return all users from userRepository.findAll", async () => {
    const users = [
      {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        role: "admin",
      },
      {
        id: "user-2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        role: "user",
      },
    ];

    userRepository.findAll.mockResolvedValue(users as any);

    const result = await useCase.findUsers();

    expect(result).toEqual(users);
  });

  it("should return an empty array when no users are found", async () => {
    userRepository.findAll.mockResolvedValue([]);

    const result = await useCase.findUsers();

    expect(result).toEqual([]);
  });

  it("should propagate errors thrown by userRepository.findAll", async () => {
    userRepository.findAll.mockRejectedValue(new Error("findAll failed"));

    await expect(useCase.findUsers()).rejects.toThrow("findAll failed");
  });
});