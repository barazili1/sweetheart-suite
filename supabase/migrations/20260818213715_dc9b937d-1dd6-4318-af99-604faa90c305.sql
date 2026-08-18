CREATE POLICY "Service role manages Telegram bot settings"
ON public.telegram_bot_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);