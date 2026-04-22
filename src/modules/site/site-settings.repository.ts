import prisma from "../../config/database";

const SINGLETON_ID = "default";

export async function getFeaturedEventId(): Promise<string | null> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: SINGLETON_ID },
    select: { featuredEventId: true },
  });
  return row?.featuredEventId ?? null;
}

export async function setFeaturedEventId(eventId: string | null): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      featuredEventId: eventId,
    },
    update: {
      featuredEventId: eventId,
    },
  });
}

export async function clearFeaturedIfMatchesEventId(eventId: string): Promise<void> {
  const current = await getFeaturedEventId();
  if (current === eventId) {
    await setFeaturedEventId(null);
  }
}
