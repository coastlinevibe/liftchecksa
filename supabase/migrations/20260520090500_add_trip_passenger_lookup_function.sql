CREATE OR REPLACE FUNCTION public.get_trip_passengers(p_trip_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  surname text,
  zii_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_row_id uuid;
  v_driver_user_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT driver_profiles.id, profiles.id
  INTO v_driver_row_id, v_driver_user_profile_id
  FROM trips
  JOIN driver_profiles ON driver_profiles.id = trips.driver_id
  JOIN profiles ON profiles.user_id = driver_profiles.user_id
  WHERE trips.id = p_trip_id
    AND driver_profiles.user_id = auth.uid();

  IF v_driver_row_id IS NULL OR v_driver_user_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH participant_ids AS (
    SELECT DISTINCT passenger_id AS profile_id
    FROM trip_requests
    WHERE trip_id = p_trip_id

    UNION

    SELECT DISTINCT CASE
      WHEN sender_id = v_driver_user_profile_id THEN receiver_id
      ELSE sender_id
    END AS profile_id
    FROM trip_chats
    WHERE trip_id = p_trip_id
      AND (sender_id = v_driver_user_profile_id OR receiver_id = v_driver_user_profile_id)
  )
  SELECT p.id, p.first_name::text, p.surname::text, p.zii_status::text
  FROM profiles p
  JOIN participant_ids participant ON participant.profile_id = p.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_passengers(uuid) TO authenticated;
