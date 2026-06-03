import type { GameDeal } from "@/lib/types";

type CheapSharkDeal = {
  dealID?: string;
  title?: string;
  salePrice?: string;
  normalPrice?: string;
  savings?: string;
  steamRatingPercent?: string;
};

export async function getLiveGameDeals(): Promise<GameDeal[]> {
  try {
    const response = await fetch(
      "https://www.cheapshark.com/api/1.0/deals?storeID=1&pageSize=5&sortBy=Savings&onSale=1",
      {
        next: {
          revalidate: 900
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const deals = (await response.json()) as CheapSharkDeal[];

    return deals
      .filter((deal) => deal.dealID && deal.title)
      .map((deal) => ({
        dealID: deal.dealID ?? "",
        title: deal.title ?? "Untitled Game",
        salePrice: deal.salePrice ?? "0.00",
        normalPrice: deal.normalPrice ?? "0.00",
        savings: deal.savings ?? "0",
        steamRatingPercent: deal.steamRatingPercent ?? "0"
      }));
  } catch {
    return [];
  }
}
