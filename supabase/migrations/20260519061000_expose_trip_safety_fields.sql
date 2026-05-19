DROP FUNCTION IF EXISTS public.get_published_trip_cards();

CREATE FUNCTION public.get_published_trip_cards()
RETURNS TABLE (
  id uuid,
  driver_id uuid,
  vehicle_id uuid,
  origin varchar,
  destination varchar,
  route_corridor varchar,
  departure_date date,
  departure_time time,
  seats_total integer,
  seats_available integer,
  cost_share_amount numeric,
  luggage_rules text,
  pickup_points text[],
  dropoff_points text[],
  notes text,
  passenger_rules text,
  status trip_status,
  public_slug varchar,
  created_at timestamptz,
  updated_at timestamptz,
  driver_first_name varchar,
  driver_surname varchar,
  driver_profile_photo_url text,
  driver_rating_average numeric,
  driver_rating_count integer,
  driver_completed_trips integer,
  driver_verification_status verification_status,
  vehicle_make varchar,
  vehicle_model varchar,
  vehicle_colour varchar,
  vehicle_licence_plate varchar,
  vehicle_photo_url text,
  vehicle_verification_status verification_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    trips.id,
    trips.driver_id,
    trips.vehicle_id,
    trips.origin,
    trips.destination,
    trips.route_corridor,
    trips.departure_date,
    trips.departure_time,
    trips.seats_total,
    trips.seats_available,
    trips.cost_share_amount,
    trips.luggage_rules,
    trips.pickup_points,
    trips.dropoff_points,
    trips.notes,
    trips.passenger_rules,
    trips.status,
    trips.public_slug,
    trips.created_at,
    trips.updated_at,
    profiles.first_name,
    profiles.surname,
    profiles.profile_photo_url,
    driver_profiles.rating_average,
    driver_profiles.rating_count,
    driver_profiles.completed_trips,
    driver_profiles.verification_status,
    vehicles.make,
    vehicles.model,
    vehicles.colour,
    CASE
      WHEN auth.role() = 'authenticated' THEN vehicles.licence_plate
      ELSE NULL
    END,
    CASE
      WHEN auth.role() = 'authenticated' THEN vehicles.vehicle_photo_url
      ELSE NULL
    END,
    vehicles.verification_status
  FROM trips
  JOIN driver_profiles ON driver_profiles.id = trips.driver_id
  LEFT JOIN profiles ON profiles.user_id = driver_profiles.user_id
  LEFT JOIN vehicles ON vehicles.id = trips.vehicle_id
  WHERE trips.status = 'published'
    AND trips.seats_available > 0
  ORDER BY trips.departure_date ASC, trips.departure_time ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_trip_cards() TO anon, authenticated;
