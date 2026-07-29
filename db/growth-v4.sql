create extension if not exists pgcrypto;

alter table waitlist_leads add column if not exists camera_brands text[];
alter table waitlist_leads add column if not exists camera_models text;
alter table waitlist_leads add column if not exists camera_connection text;
alter table waitlist_leads add column if not exists price_intent text;
alter table waitlist_leads add column if not exists purchase_blocker text;
alter table waitlist_leads add column if not exists founder_reservation_status text not null default 'none';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'waitlist_leads_camera_connection_check') then
    alter table waitlist_leads add constraint waitlist_leads_camera_connection_check check (
      camera_connection is null or camera_connection in (
        'local_rtsp_onvif', 'home_assistant', 'nvr_nas', 'vendor_cloud', 'not_sure', 'no_cameras'
      )
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_leads_price_intent_check') then
    alter table waitlist_leads add constraint waitlist_leads_price_intent_check check (
      price_intent is null or price_intent in ('definitely', 'probably', 'not_sure', 'no')
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_leads_purchase_blocker_check') then
    alter table waitlist_leads add constraint waitlist_leads_purchase_blocker_check check (
      purchase_blocker is null or purchase_blocker in (
        'compatibility', 'price', 'privacy', 'setup', 'shipping', 'timing', 'other'
      )
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_leads_founder_reservation_status_check') then
    alter table waitlist_leads add constraint waitlist_leads_founder_reservation_status_check check (
      founder_reservation_status in ('none', 'checkout_started', 'paid', 'refund_pending', 'refunded', 'expired')
    );
  end if;
end $$;

create table if not exists founder_reservations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references waitlist_leads(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_customer_id text,
  stripe_refund_id text,
  amount_cents integer not null default 1000,
  currency text not null default 'usd',
  status text not null default 'checkout_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  constraint founder_reservations_amount_check check (amount_cents = 1000),
  constraint founder_reservations_currency_check check (currency = 'usd'),
  constraint founder_reservations_status_check check (
    status in ('checkout_started', 'paid', 'refund_pending', 'refunded', 'expired')
  )
);

create index if not exists waitlist_leads_camera_connection_idx on waitlist_leads (camera_connection);
create index if not exists waitlist_leads_camera_brands_idx on waitlist_leads using gin (camera_brands);
create index if not exists waitlist_leads_price_intent_idx on waitlist_leads (price_intent);
create index if not exists waitlist_leads_founder_reservation_status_idx on waitlist_leads (founder_reservation_status);
create index if not exists founder_reservations_status_idx on founder_reservations (status, paid_at);
