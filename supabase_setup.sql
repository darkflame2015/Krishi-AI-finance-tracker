-- Run this entire script in the SQL Editor in your Supabase Dashboard

-- 1. Create the `users` table
CREATE TABLE users (
    uid TEXT PRIMARY KEY,
    email TEXT,
    "displayName" TEXT,
    "photoURL" TEXT,
    role TEXT DEFAULT 'user',
    region TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the `loans` table
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" TEXT REFERENCES users(uid),
    type TEXT,
    amount NUMERIC,
    status TEXT DEFAULT 'pending',
    purpose TEXT,
    "amountPaid" NUMERIC DEFAULT 0,
    "adminNotes" TEXT,
    documents JSONB DEFAULT '[]'::JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the `groups` table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    members INTEGER DEFAULT 0,
    "portfolioSize" NUMERIC DEFAULT 0,
    "riskProfile" TEXT,
    "repaymentAmount" NUMERIC DEFAULT 0,
    "amountPaid" NUMERIC DEFAULT 0,
    region TEXT,
    "activeSince" DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active'
);

-- 4. Create the `payments` table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" TEXT REFERENCES users(uid),
    "loanId" UUID REFERENCES loans(id),
    amount NUMERIC,
    date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'completed'
);

-- 5. Create the `notifications` table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" TEXT REFERENCES users(uid),
    title TEXT,
    message TEXT,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for specific tables so the frontend UI auto-updates
ALTER PUBLICATION supabase_realtime ADD TABLE notifications, loans, groups;

-- Optional: Since we are using Firebase Auth exclusively on the frontend but connecting to Supabase Database
-- via the Anon key directly on the client, you need Policies that allow public API access, 
-- or you can disable Row Level Security (RLS) outright for this prototype as we trust the client logic to filter by `userId`.
-- For MVP prototype, we will disable RLS so client queries succeed freely:
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Note on Storage:
-- 1. Go to "Storage" in Supabase left menu.
-- 2. Click "New Bucket", name it exactly "documents".
-- 3. Make sure to toggle "Public bucket" to ON.
