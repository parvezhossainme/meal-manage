import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import bcrypt from "bcryptjs"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Create default expense categories
  const categories = ["Main", "Extra", "Utilities", "Groceries", "Maintenance", "Other"]
  for (const name of categories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log("✅ Expense categories created")

  // Create super admin
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@mealmanage.com" },
    update: {},
    create: {
      email: "admin@mealmanage.com",
      name: "Super Admin",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  })
  console.log("✅ Super admin created: admin@mealmanage.com / admin123")

  // Create test members
  const memberData = [
    { name: "Alice Rahman", email: "alice@example.com" },
    { name: "Bob Hasan", email: "bob@example.com" },
    { name: "Carol Islam", email: "carol@example.com" },
  ]

  for (const m of memberData) {
    const userPassword = await bcrypt.hash("member123", 10)
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        name: m.name,
        password: userPassword,
        role: "MEMBER",
      },
    })
    await prisma.member.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: m.name,
        email: m.email,
        active: true,
      },
    })
  }
  console.log("✅ Test members created (password: member123)")

  // Add default settings
  const defaultSettings = {
    app_name: "Meal Manage",
    currency: "৳",
    main_category: "Main",
  }
  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log("✅ Default settings created")

  console.log("\n🎉 Seeding complete!")
  console.log("   Admin: admin@mealmanage.com / admin123")
  console.log("   Members: alice@example.com, bob@example.com, carol@example.com / member123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
