-- Fix: reviews INSERT policy allowed reviews on paid-but-not-completed
-- bookings. Require booking_status = 'completed' in addition to
-- payment_status = 'paid'.

drop policy if exists "reviews: planner create for own paid booking" on public.reviews;

create policy "reviews: planner create for own paid booking"
  on public.reviews for insert
  with check (
    planner_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.planner_id = auth.uid()
        and b.vendor_id = vendor_id
        and b.payment_status = 'paid'
        and b.booking_status = 'completed'
    )
  );
