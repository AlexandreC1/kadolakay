ALTER TABLE merchant_payment_profiles DROP CONSTRAINT "merchant_payment_profiles_businessId_fkey";
ALTER TABLE merchant_payment_profiles ADD CONSTRAINT "merchant_payment_profiles_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE premium_grants DROP CONSTRAINT "premium_grants_userId_fkey";
ALTER TABLE premium_grants ADD CONSTRAINT "premium_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
