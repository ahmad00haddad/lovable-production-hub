import { queryOptions } from "@tanstack/react-query";
import {
  getFinanceOverview,
  getQuotationsList,
  getQuotationDetail,
} from "@/lib/finance.functions";

export const financeOverviewQuery = (projectId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["finance-overview", projectId],
    queryFn: () => getFinanceOverview({ data: { projectId } }),
    enabled,
  });

export const quotationsListQuery = (projectId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["finance-quotations", projectId],
    queryFn: () => getQuotationsList({ data: { projectId } }),
    enabled,
  });

export const quotationDetailQuery = (projectId: string, quoteId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["finance-quotation", projectId, quoteId],
    queryFn: () => getQuotationDetail({ data: { projectId, quoteId } }),
    enabled,
  });
