-- LiftCheck Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Roles Enum
CREATE TYPE user_role AS ENUM ('member', 'driver', 'group_admin', 'platform_admin');

-- Membership Types
CREATE TYPE membership_type AS ENUM ('basic', 'plus', 'provider', 'group_admin');

-- Membership Status
CREATE TYPE membership_status AS ENUM ('pending', 'active', 'expired', 'suspended');

-- Verification Status
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Trip Status
CREATE TYPE trip_status AS ENUM ('draft', 'published', 'full', 'completed', 'cancelled');

-- Request Status
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- Report Status
CREATE TYPE report_status AS ENUM ('new', 'under_review', 'warning_issued', 'suspended', 'banned', 'cleared', 'appeal_requested');

-- Payment Status
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Zii Status
CREATE TYPE zii_status AS ENUM ('inactive', 'active', 'expired');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    first_name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    profile_photo_url TEXT,
    membership_type membership_type NOT NULL DEFAULT 'basic',
    membership_status membership_status NOT NULL DEFAULT 'pending',
    membership_expires_at TIMESTAMP WITH TIME ZONE,
    zii_status zii_status NOT NULL DEFAULT 'inactive',
    home_province VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DRIVER PROFILES TABLE
-- ============================================
CREATE TABLE driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    licence_status verification_status NOT NULL DEFAULT 'pending',
    id_status verification_status NOT NULL DEFAULT 'pending',
    vehicle_status verification_status NOT NULL DEFAULT 'pending',
    provider_plan VARCHAR(50) NOT NULL DEFAULT 'monthly',
    provider_expires_at TIMESTAMP WITH TIME ZONE,
    completed_trips INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    cancellation_count INTEGER DEFAULT 0,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    id_document_url TEXT,
    licence_document_url TEXT,
    proof_of_address_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VEHICLES TABLE
-- ============================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES driver_profiles(id) ON DELETE CASCADE NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    colour VARCHAR(50) NOT NULL,
    licence_plate VARCHAR(20) NOT NULL,
    year INTEGER,
    licence_disc_url TEXT,
    vehicle_photo_url TEXT,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIPS TABLE
-- ============================================
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES driver_profiles(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    origin VARCHAR(200) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    route_corridor VARCHAR(200),
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    seats_total INTEGER NOT NULL,
    seats_available INTEGER NOT NULL,
    cost_share_amount DECIMAL(10,2) NOT NULL,
    luggage_rules TEXT,
    pickup_points TEXT[],
    dropoff_points TEXT[],
    notes TEXT,
    passenger_rules TEXT,
    status trip_status NOT NULL DEFAULT 'draft',
    public_slug VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIP REQUESTS TABLE
-- ============================================
CREATE TABLE trip_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    passenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    seats_requested INTEGER NOT NULL DEFAULT 1,
    message TEXT,
    pickup_point VARCHAR(200),
    dropoff_point VARCHAR(200),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(trip_id, passenger_id)
);

-- ============================================
-- TRIP CHATS TABLE
-- ============================================
CREATE TABLE trip_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    is_reported BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VERIFICATIONS TABLE
-- ============================================
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    verification_type VARCHAR(50) NOT NULL,
    status verification_status NOT NULL DEFAULT 'pending',
    document_url TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ZII TOKENS TABLE
-- ============================================
CREATE TABLE zii_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    token_status zii_status NOT NULL DEFAULT 'active',
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- ZII HANDSHAKES TABLE
-- ============================================
CREATE TABLE zii_handshakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES driver_profiles(id) ON DELETE CASCADE NOT NULL,
    passenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    handshake_method VARCHAR(50) NOT NULL,
    handshake_status VARCHAR(50) NOT NULL,
    device_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RATINGS TABLE
-- ============================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reviewed_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_id, reviewer_id, reviewed_user_id)
);

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    report_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    evidence_url TEXT,
    status report_status NOT NULL DEFAULT 'new',
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_type membership_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_reference VARCHAR(100) UNIQUE NOT NULL,
    proof_url TEXT,
    status payment_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SAVED ROUTES TABLE
-- ============================================
CREATE TABLE saved_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    origin VARCHAR(200) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    alert_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRUSTED DRIVERS TABLE
-- ============================================
CREATE TABLE trusted_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES driver_profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(passenger_id, driver_id)
);

-- ============================================
-- TRIP CHECK-INS TABLE
-- ============================================
CREATE TABLE trip_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    checkin_type VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_membership_status ON profiles(membership_status);
CREATE INDEX idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX idx_driver_profiles_verification_status ON driver_profiles(verification_status);
CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_departure_date ON trips(departure_date);
CREATE INDEX idx_trips_public_slug ON trips(public_slug);
CREATE INDEX idx_trip_requests_trip_id ON trip_requests(trip_id);
CREATE INDEX idx_trip_requests_passenger_id ON trip_requests(passenger_id);
CREATE INDEX idx_trip_chats_trip_id ON trip_chats(trip_id);
CREATE INDEX idx_ratings_reviewed_user_id ON ratings(reviewed_user_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE zii_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE zii_handshakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_checkins ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and edit their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Driver Profiles: Users can view and edit their own driver profile
CREATE POLICY "Users can view own driver profile" ON driver_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own driver profile" ON driver_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own driver profile" ON driver_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vehicles: Drivers can manage their own vehicles
CREATE POLICY "Drivers can view own vehicles" ON vehicles FOR SELECT USING (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can insert own vehicles" ON vehicles FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can update own vehicles" ON vehicles FOR UPDATE USING (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
);

-- Trips: Public can view published trips, drivers can manage their own
CREATE POLICY "Anyone can view published trips" ON trips FOR SELECT USING (status = 'published');
CREATE POLICY "Drivers can view own trips" ON trips FOR SELECT USING (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can insert own trips" ON trips FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can update own trips" ON trips FOR UPDATE USING (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
);

-- Trip Requests: Passengers and drivers can view their own requests
CREATE POLICY "Users can view own trip requests" ON trip_requests FOR SELECT USING (
    passenger_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    trip_id IN (SELECT id FROM trips WHERE driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Passengers can insert trip requests" ON trip_requests FOR INSERT WITH CHECK (
    passenger_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own trip requests" ON trip_requests FOR UPDATE USING (
    passenger_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    trip_id IN (SELECT id FROM trips WHERE driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()))
);

-- Trip Chats: Only trip participants can view and send messages
CREATE POLICY "Trip participants can view chats" ON trip_chats FOR SELECT USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can send messages" ON trip_chats FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Payments: Users can view and manage their own payments
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved Routes: Users can manage their own saved routes
CREATE POLICY "Users can view own saved routes" ON saved_routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved routes" ON saved_routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved routes" ON saved_routes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved routes" ON saved_routes FOR DELETE USING (auth.uid() = user_id);

-- Trusted Drivers: Passengers can manage their trusted driver list
CREATE POLICY "Passengers can view own trusted drivers" ON trusted_drivers FOR SELECT USING (
    passenger_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Passengers can add trusted drivers" ON trusted_drivers FOR INSERT WITH CHECK (
    passenger_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Passengers can remove trusted drivers" ON trusted_drivers FOR DELETE USING (
    passenger_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Ratings: Users can view ratings about them and create ratings
CREATE POLICY "Users can view ratings about them" ON ratings FOR SELECT USING (
    reviewed_user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    reviewer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create ratings" ON ratings FOR INSERT WITH CHECK (
    reviewer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Reports: Users can create reports and view their own
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (
    reporter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (
    reporter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Trip Check-ins: Users can manage their own check-ins
CREATE POLICY "Users can view own checkins" ON trip_checkins FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create checkins" ON trip_checkins FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique payment reference
CREATE OR REPLACE FUNCTION generate_payment_reference(plan membership_type)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(10);
    random_num INTEGER;
BEGIN
    CASE plan
        WHEN 'basic' THEN prefix := 'LC-M-';
        WHEN 'plus' THEN prefix := 'LC-P-';
        WHEN 'provider' THEN prefix := 'LC-D-';
        ELSE prefix := 'LC-X-';
    END CASE;
    
    random_num := floor(random() * 90000 + 10000)::INTEGER;
    RETURN prefix || random_num::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Function to update driver rating average
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE driver_profiles
    SET 
        rating_average = (
            SELECT COALESCE(AVG(rating), 0)
            FROM ratings
            WHERE reviewed_user_id IN (
                SELECT id FROM profiles WHERE user_id = (
                    SELECT user_id FROM driver_profiles WHERE id = NEW.reviewed_user_id
                )
            )
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM ratings
            WHERE reviewed_user_id IN (
                SELECT id FROM profiles WHERE user_id = (
                    SELECT user_id FROM driver_profiles WHERE id = NEW.reviewed_user_id
                )
            )
        )
    WHERE id IN (
        SELECT dp.id FROM driver_profiles dp
        JOIN profiles p ON dp.user_id = p.user_id
        WHERE p.id = NEW.reviewed_user_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_rating_trigger
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_driver_rating();
