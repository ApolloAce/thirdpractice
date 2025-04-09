import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function createExtensions(tx: postgres.Sql) {
  // Only create extensions once
  await tx`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
}

async function createTables(tx: postgres.Sql) {
  await tx`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;
  await tx`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;
  await tx`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;
  await tx`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;
}

async function seedUsers(tx: postgres.Sql) {
  // Use batch insert for better performance
  const userInsertPromises = users.map(async (user) => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    return tx`
      INSERT INTO users (id, name, email, password)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
      ON CONFLICT (id) DO NOTHING;
    `;
  });
  await Promise.all(userInsertPromises);
}

async function seedCustomers(tx: postgres.Sql) {
  const customerInsertPromises = customers.map((customer) =>
    tx`
      INSERT INTO customers (id, name, email, image_url)
      VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
      ON CONFLICT (id) DO NOTHING;
    `
  );
  await Promise.all(customerInsertPromises);
}

async function seedInvoices(tx: postgres.Sql) {
  const invoiceInsertPromises = invoices.map((invoice) =>
    tx`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
      ON CONFLICT (id) DO NOTHING;
    `
  );
  await Promise.all(invoiceInsertPromises);
}

async function seedRevenue(tx: postgres.Sql) {
  const revenueInsertPromises = revenue.map((rev) =>
    tx`
      INSERT INTO revenue (month, revenue)
      VALUES (${rev.month}, ${rev.revenue})
      ON CONFLICT (month) DO NOTHING;
    `
  );
  await Promise.all(revenueInsertPromises);
}

export async function GET() {
  try {
    await sql.begin(async (tx) => {
      await createExtensions(tx);  // Create extensions once
      await createTables(tx);      // Create tables once
      await seedUsers(tx);
      await seedCustomers(tx);
      await seedInvoices(tx);
      await seedRevenue(tx);
    });

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seeding error:', error);
    return Response.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
