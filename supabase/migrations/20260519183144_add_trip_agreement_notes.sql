CREATE TABLE IF NOT EXISTS trip_agreements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  passenger_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notes text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (trip_id, passenger_id)
);

ALTER TABLE trip_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip agreement participants can view notes" ON trip_agreements;
DROP POLICY IF EXISTS "Trip drivers can insert agreement notes" ON trip_agreements;
DROP POLICY IF EXISTS "Trip drivers can update agreement notes" ON trip_agreements;

CREATE POLICY "Trip agreement participants can view notes"
ON trip_agreements
FOR SELECT
TO authenticated
USING (
  passenger_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR trip_id IN (
    SELECT trips.id
    FROM trips
    JOIN driver_profiles ON driver_profiles.id = trips.driver_id
    WHERE driver_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Trip drivers can insert agreement notes"
ON trip_agreements
FOR INSERT
TO authenticated
WITH CHECK (
  trip_id IN (
    SELECT trips.id
    FROM trips
    JOIN driver_profiles ON driver_profiles.id = trips.driver_id
    WHERE driver_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Trip drivers can update agreement notes"
ON trip_agreements
FOR UPDATE
TO authenticated
USING (
  trip_id IN (
    SELECT trips.id
    FROM trips
    JOIN driver_profiles ON driver_profiles.id = trips.driver_id
    WHERE driver_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  trip_id IN (
    SELECT trips.id
    FROM trips
    JOIN driver_profiles ON driver_profiles.id = trips.driver_id
    WHERE driver_profiles.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE ON trip_agreements TO authenticated;
