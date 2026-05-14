-- Collection Requests Table (On-Demand Collection)
CREATE TABLE IF NOT EXISTS collection_requests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('Selangor', 'KL')),
  waste_types TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES app_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (authenticated or anonymous)
CREATE POLICY "Anyone can create collection requests" ON collection_requests
  FOR INSERT WITH CHECK (true);

-- Allow reading by authenticated admins only
CREATE POLICY "Admins can view all requests" ON collection_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_collection_requests_status ON collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_collection_requests_state ON collection_requests(state);
CREATE INDEX IF NOT EXISTS idx_collection_requests_created ON collection_requests(created_at DESC);
