// Makes the FIRST admin (admins can't register from the website)
// Run once:  npm run seed
// Uses ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD from .env
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const mongoose = require("mongoose");
const userSchema = require("../model/User");
const { makeInitials } = require("./helpers");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const name = process.env.ADMIN_NAME || "Super Admin";
    const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.log("Please set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
      process.exit(1);
    }

    const exists = await userSchema.findOne({ email });
    if (exists) {
      console.log(`Admin already exists: ${email}`);
      process.exit(0);
    }

    await userSchema.create({
      name,
      initials: makeInitials(name),
      email,
      password, // hashed automatically (pre "save")
      role: "admin",
      isVerified: true,
    });

    console.log(`Admin created: ${email}`);
    process.exit(0);
  } catch (error) {
    console.log("Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
