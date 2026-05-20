ALTER TABLE trip_requests
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_status text,
ADD COLUMN IF NOT EXISTS payment_proof_url text,
ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

CREATE OR REPLACE FUNCTION public.reserve_trip_seat(
  p_trip_id uuid,
  p_message text,
  p_pickup_point text,
  p_dropoff_point text,
  p_seats_requested integer
)
RETURNS trip_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_current_request trip_requests%ROWTYPE;
  v_request trip_requests%ROWTYPE;
  v_old_seats integer := 0;
  v_delta integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_seats_requested IS NULL OR p_seats_requested < 1 THEN
    RAISE EXCEPTION 'Seats requested must be at least 1';
  END IF;

  SELECT id
  INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT *
  INTO v_current_request
  FROM trip_requests
  WHERE trip_id = p_trip_id
    AND passenger_id = v_profile_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_old_seats := v_current_request.seats_requested;
  END IF;

  v_delta := p_seats_requested - v_old_seats;

  IF v_delta > 0 THEN
    UPDATE trips
    SET seats_available = seats_available - v_delta
    WHERE id = p_trip_id
      AND seats_available >= v_delta
    RETURNING seats_available INTO v_old_seats;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not enough seats available';
    END IF;
  ELSIF v_delta < 0 THEN
    UPDATE trips
    SET seats_available = seats_available + ABS(v_delta)
    WHERE id = p_trip_id
    RETURNING seats_available INTO v_old_seats;
  END IF;

  IF v_current_request.id IS NOT NULL THEN
    UPDATE trip_requests
    SET seats_requested = p_seats_requested,
        message = p_message,
        pickup_point = p_pickup_point,
        dropoff_point = p_dropoff_point,
        status = 'accepted',
        accepted_at = now()
    WHERE id = v_current_request.id
    RETURNING * INTO v_request;
  ELSE
    INSERT INTO trip_requests (
      trip_id,
      passenger_id,
      status,
      seats_requested,
      message,
      pickup_point,
      dropoff_point,
      accepted_at
    )
    VALUES (
      p_trip_id,
      v_profile_id,
      'accepted',
      p_seats_requested,
      p_message,
      p_pickup_point,
      p_dropoff_point,
      now()
    )
    RETURNING * INTO v_request;
  END IF;

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_trip_seat(uuid, text, text, text, integer) TO authenticated;
