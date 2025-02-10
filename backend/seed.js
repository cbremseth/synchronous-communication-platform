import User from "./models/Users.js";
import bcrypt from "bcryptjs";

const seedUsers = async () => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      console.log("Seeding test users...");

      const users = [
        {
          username: "testuser1",
          email: "test1@example.com",
          password: await bcrypt.hash("password", 10),
        },
        {
          username: "testuser2",
          email: "test2@example.com",
          password: await bcrypt.hash("password", 10),
        },
      ];

      await User.insertMany(users);
      console.log("Test users added successfully!");
    } else {
      console.log("Test users already exist.");
    }
  } catch (error) {
    console.error("Error seeding users:", error);
  }
};

export default seedUsers;
