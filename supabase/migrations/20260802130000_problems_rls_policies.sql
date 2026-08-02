CREATE POLICY problems_insert_authenticated
  ON public.problems
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY problems_update_authenticated
  ON public.problems
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);