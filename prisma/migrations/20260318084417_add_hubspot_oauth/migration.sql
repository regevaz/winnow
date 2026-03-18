-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "hubspotAccessToken" TEXT,
ADD COLUMN     "hubspotOAuthState" TEXT,
ADD COLUMN     "hubspotPortalId" TEXT,
ADD COLUMN     "hubspotRefreshToken" TEXT,
ADD COLUMN     "hubspotTokenExpiresAt" TIMESTAMP(3);
