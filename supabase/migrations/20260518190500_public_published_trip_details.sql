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
  driver_rating_average numeric,
  driver_rating_count integer,
  driver_completed_trips integer,
  driver_verification_status verification_status,
  vehicle_make varchar,
  vehicle_model varchar,
  vehicle_colour varchar,
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
    driver_profiles.rating_average,
    driver_profiles.rating_count,
    driver_profiles.completed_trips,
    driver_profiles.verification_status,
    vehicles.make,
    vehicles.model,
    vehicles.colour,
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

CREATE OR REPLACE FUNCTION public.activate_profile_on_driver_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'approved'
     AND OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    UPDATE profiles
    SET membership_status = 'active'
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_activate_profile_on_driver_approval ON driver_profiles;

CREATE TRIGGER trigger_activate_profile_on_driver_approval
AFTER UPDATE OF verification_status ON driver_profiles
FOR EACH ROW
EXECUTE FUNCTION public.activate_profile_on_driver_approval();

UPDATE profiles
SET membership_status = 'active'
FROM driver_profiles
WHERE profiles.user_id = driver_profiles.user_id
  AND driver_profiles.verification_status = 'approved'
  AND profiles.membership_status IS DISTINCT FROM 'active';

CREATE OR REPLACE FUNCTION public.activate_profile_on_payment_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE profiles
    SET membership_status = 'active',
        membership_expires_at = COALESCE(NEW.expires_at, profiles.membership_expires_at)
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_activate_profile_on_payment_approval ON payments;

CREATE TRIGGER trigger_activate_profile_on_payment_approval
AFTER UPDATE OF status ON payments
FOR EACH ROW
EXECUTE FUNCTION public.activate_profile_on_payment_approval();

UPDATE profiles
SET membership_status = 'active'
FROM payments
WHERE profiles.user_id = payments.user_id
  AND payments.status = 'approved'
  AND profiles.membership_status IS DISTINCT FROM 'active';
