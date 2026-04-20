-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  genre TEXT,
  profil JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Constraints table
CREATE TABLE constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blacklist', 'tutorat')),
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. History pairs table
CREATE TABLE history_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  count_sessions INTEGER DEFAULT 1,
  UNIQUE(user_id, student_a_id, student_b_id)
);

-- 4. Layouts table
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grid_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Archives table
CREATE TABLE archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan JSONB NOT NULL,
  layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES
CREATE POLICY "Users can only access their own students" ON students
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own constraints" ON constraints
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own history" ON history_pairs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own layouts" ON layouts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own archives" ON archives
  FOR ALL USING (auth.uid() = user_id);
