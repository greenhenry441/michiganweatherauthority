
CREATE POLICY "storm photos public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'storm-photos');

CREATE POLICY "storm photos owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'storm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "storm photos owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'storm-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'storm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "storm photos owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'storm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
