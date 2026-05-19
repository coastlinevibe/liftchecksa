CREATE OR REPLACE FUNCTION public.send_trip_chat_message(
  p_trip_id uuid,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_profile_id uuid;
  v_receiver_profile_id uuid;
  v_message_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'Message is required';
  END IF;

  SELECT id
  INTO v_sender_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_sender_profile_id IS NULL THEN
    RAISE EXCEPTION 'Sender profile not found';
  END IF;

  SELECT profiles.id
  INTO v_receiver_profile_id
  FROM trips
  JOIN driver_profiles ON driver_profiles.id = trips.driver_id
  JOIN profiles ON profiles.user_id = driver_profiles.user_id
  WHERE trips.id = p_trip_id;

  IF v_receiver_profile_id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found';
  END IF;

  INSERT INTO trip_chats (trip_id, sender_id, receiver_id, message)
  VALUES (p_trip_id, v_sender_profile_id, v_receiver_profile_id, trim(p_message))
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_trip_chat_message(uuid, text) TO authenticated;
