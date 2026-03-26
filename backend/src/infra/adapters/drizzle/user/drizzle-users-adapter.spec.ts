import { DrizzleUsersOrmAdapter } from "../../../adapters/drizzle/user/drizzle-users-adapter";
import { User } from "../../../../core/domain/user/entity/user";
import { UserSchema } from "../../../persistence/schemas/user-schema";
import { eq } from "drizzle-orm";

jest.mock("drizzle-orm", () => ({
  ...jest.requireActual("drizzle-orm"),
  eq: jest.fn(),
}));

jest.mock("../../../../core/domain/user/entity/user", () => ({
  User: {
    create: jest.fn(),
  },
}));

describe("DrizzleUsersOrmAdapter", () => {
  let adapter: DrizzleUsersOrmAdapter;
  let db: any;

  beforeEach(() => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };

    adapter = new DrizzleUsersOrmAdapter(db);
    jest.clearAllMocks();
  });

  describe("select", () => {
    it("should return null when no user is found", async () => {
      const whereMock = jest.fn().mockResolvedValue([]);
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      db.select.mockReturnValue({ from: fromMock });

      const result = await adapter.select("firebase-123");

      expect(db.select).toHaveBeenCalledTimes(1);
      expect(fromMock).toHaveBeenCalledWith(UserSchema);
      expect(eq).toHaveBeenCalledWith(UserSchema.firebaseUid, "firebase-123");
      expect(whereMock).toHaveBeenCalledTimes(1);
      expect(User.create).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should map the row to a User when a user is found", async () => {
      const userRow = {
        firebaseUid: "firebase-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
      const domainUser = { ...userRow, id: "1" };

      const whereMock = jest.fn().mockResolvedValue([userRow]);
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      db.select.mockReturnValue({ from: fromMock });
      (User.create as jest.Mock).mockReturnValue(domainUser);

      const result = await adapter.select("firebase-123");

      expect(User.create).toHaveBeenCalledWith(userRow);
      expect(result).toEqual(domainUser);
    });

    it("should propagate errors from db.select query", async () => {
      const whereMock = jest.fn().mockRejectedValue(new Error("select failed"));
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      db.select.mockReturnValue({ from: fromMock });

      await expect(adapter.select("firebase-123")).rejects.toThrow("select failed");
    });
  });

  describe("findAll", () => {
    it("should return mapped users", async () => {
      const rows = [
        {
          firebaseUid: "u1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        {
          firebaseUid: "u2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      ];

      const mappedUsers = [{ id: "1" }, { id: "2" }];

      const fromMock = jest.fn().mockResolvedValue(rows);
      db.select.mockReturnValue({ from: fromMock });
      (User.create as jest.Mock)
        .mockReturnValueOnce(mappedUsers[0])
        .mockReturnValueOnce(mappedUsers[1]);

      const result = await adapter.findAll();

      expect(db.select).toHaveBeenCalledTimes(1);
      expect(fromMock).toHaveBeenCalledWith(UserSchema);
      expect(User.create).toHaveBeenCalledTimes(2);
      expect(User.create).toHaveBeenNthCalledWith(1, rows[0]);
      expect(User.create).toHaveBeenNthCalledWith(2, rows[1]);
      expect(result).toEqual(mappedUsers);
    });

    it("should return an empty array when there are no users", async () => {
      const fromMock = jest.fn().mockResolvedValue([]);
      db.select.mockReturnValue({ from: fromMock });

      const result = await adapter.findAll();

      expect(result).toEqual([]);
      expect(User.create).not.toHaveBeenCalled();
    });

    it("should propagate errors from db.findAll query", async () => {
      const fromMock = jest.fn().mockRejectedValue(new Error("findAll failed"));
      db.select.mockReturnValue({ from: fromMock });

      await expect(adapter.findAll()).rejects.toThrow("findAll failed");
    });
  });

  describe("create", () => {
    it("should insert a user with the correct values", async () => {
      const insertedResult = { rowCount: 1 };

      const valuesMock = jest.fn().mockResolvedValue(insertedResult);
      const insertIntoMock = jest.fn().mockReturnValue({ values: valuesMock });
      db.insert.mockReturnValue({ values: valuesMock });
      db.insert = jest.fn().mockReturnValue({ values: valuesMock });

      const result = await adapter.create(
        "firebase-123",
        "John",
        "Doe",
        "john@example.com"
      );

      expect(db.insert).toHaveBeenCalledWith(UserSchema);
      expect(valuesMock).toHaveBeenCalledWith({
        firebaseUid: "firebase-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });
      expect(result).toEqual(insertedResult);
    });

    it("should propagate errors from db.insert", async () => {
      const valuesMock = jest.fn().mockRejectedValue(new Error("create failed"));
      db.insert.mockReturnValue({ values: valuesMock });

      await expect(
        adapter.create("firebase-123", "John", "Doe", "john@example.com")
      ).rejects.toThrow("create failed");
    });
  });

  describe("delete", () => {
    it("should return true when rowCount is not null", async () => {
      const whereMock = jest.fn().mockResolvedValue({ rowCount: 1 });
      db.delete.mockReturnValue({ where: whereMock });

      const result = await adapter.delete("firebase-123");

      expect(db.delete).toHaveBeenCalledWith(UserSchema);
      expect(eq).toHaveBeenCalledWith(UserSchema.firebaseUid, "firebase-123");
      expect(whereMock).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it("should return false when rowCount is null", async () => {
      const whereMock = jest.fn().mockResolvedValue({ rowCount: null });
      db.delete.mockReturnValue({ where: whereMock });

      const result = await adapter.delete("firebase-123");

      expect(result).toBe(false);
    });

    it("should still return true when rowCount is 0 because the implementation only checks for null", async () => {
      const whereMock = jest.fn().mockResolvedValue({ rowCount: 0 });
      db.delete.mockReturnValue({ where: whereMock });

      const result = await adapter.delete("firebase-123");

      expect(result).toBe(true);
    });

    it("should propagate errors from db.delete", async () => {
      const whereMock = jest.fn().mockRejectedValue(new Error("delete failed"));
      db.delete.mockReturnValue({ where: whereMock });

      await expect(adapter.delete("firebase-123")).rejects.toThrow("delete failed");
    });
  });

  describe("update", () => {
    it("should throw method not implemented", () => {
      expect(() => adapter.update("firebase-123", { firstName: "Jane" })).toThrow(
        "Method not implemented."
      );
    });
  });
});