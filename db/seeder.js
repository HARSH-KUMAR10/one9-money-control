const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { User, Category, Income, Expense, Trip } = require("./model");

const seedDatabase = async () => {
  await mongoose.connect(
    "mongodb+srv://root:harsh123@cluster0.fuz20.mongodb.net/nineteen-money-control?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );

  // Clear existing data
  //   await User.deleteMany({});
  //   await Category.deleteMany({});
  //   await Income.deleteMany({});
  //   await Expense.deleteMany({});
  //   await Trip.deleteMany({});

  // Create users
  const hashedPassword1 = await bcrypt.hash("password123", 10);
  const hashedPassword2 = await bcrypt.hash("password456", 10);

  const user1 = await User.create({
    email: "user1@example.com",
    hashedPassword: hashedPassword1,
  });
  const user2 = await User.create({
    email: "user2@example.com",
    hashedPassword: hashedPassword2,
  });

  // Create categories
  const incomeCategory1 = await Category.create({
    userId: user1._id,
    name: "Salary",
    type: "income",
  });
  const expenseCategory1 = await Category.create({
    userId: user1._id,
    name: "Rent",
    type: "expense",
  });
  const incomeCategory2 = await Category.create({
    userId: user2._id,
    name: "Freelance",
    type: "income",
  });
  const expenseCategory2 = await Category.create({
    userId: user2._id,
    name: "Groceries",
    type: "expense",
  });

  // Create incomes and expenses for user1
  const incomesUser1 = [];
  const expensesUser1 = [];
  for (let i = 0; i < 10; i++) {
    incomesUser1.push(
      await Income.create({
        userId: user1._id,
        categoryId: incomeCategory1._id,
        amount: 5000 + i * 100,
        source: `Job ${i + 1}`,
        date: new Date(2024, i % 12, 1),
        type: i % 2 === 0 ? "fixed" : "variable",
      })
    );

    expensesUser1.push(
      await Expense.create({
        userId: user1._id,
        categoryId: expenseCategory1._id,
        amount: 1500 + i * 50,
        description: `Expense ${i + 1}`,
        date: new Date(2024, i % 12, 15),
        type: i % 2 === 0 ? "fixed" : "variable",
        needOrWant: i % 2 === 0 ? "need" : "want",
      })
    );
  }

  // Create incomes and expenses for user2
  const incomesUser2 = [];
  const expensesUser2 = [];
  for (let i = 0; i < 10; i++) {
    incomesUser2.push(
      await Income.create({
        userId: user2._id,
        categoryId: incomeCategory2._id,
        amount: 3000 + i * 200,
        source: `Project ${i + 1}`,
        date: new Date(2024, i % 12, 5),
        type: i % 2 === 0 ? "fixed" : "variable",
      })
    );

    expensesUser2.push(
      await Expense.create({
        userId: user2._id,
        categoryId: expenseCategory2._id,
        amount: 1000 + i * 100,
        description: `Expense ${i + 1}`,
        date: new Date(2024, i % 12, 20),
        type: i % 2 === 0 ? "fixed" : "variable",
        needOrWant: i % 2 === 0 ? "need" : "want",
      })
    );
  }

  // Create trips for user1 and user2
  const trip1 = await Trip.create({
    userId: user1._id,
    name: "Vacation to Bali",
    startDate: new Date(2024, 5, 10),
    endDate: new Date(2024, 5, 20),
    expenses: expensesUser1.slice(0, 5).map((expense) => expense._id),
  });

  const trip2 = await Trip.create({
    userId: user2._id,
    name: "Business Trip to New York",
    startDate: new Date(2024, 8, 15),
    endDate: new Date(2024, 8, 25),
    expenses: expensesUser2.slice(0, 5).map((expense) => expense._id),
  });

  console.log("Database seeded successfully!");
  mongoose.connection.close();
};

seedDatabase().catch((err) => {
  console.error("Error seeding database:", err);
  mongoose.connection.close();
});
