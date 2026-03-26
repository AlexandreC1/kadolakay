"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateBusinessStatus } from "./actions";

interface Business {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string | null;
  status: string;
  ownerName: string | null;
  ownerEmail: string;
  productCount: number;
  createdAt: string;
}

const statusBadge: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export function AdminBusinessList({
  businesses,
}: {
  businesses: Business[];
}) {
  const [items, setItems] = useState(businesses);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(
    businessId: string,
    newStatus: "APPROVED" | "SUSPENDED"
  ) {
    setLoading(businessId);
    await updateBusinessStatus(businessId, newStatus);
    setItems((prev) =>
      prev.map((b) =>
        b.id === businessId ? { ...b, status: newStatus } : b
      )
    );
    setLoading(null);
  }

  const pending = items.filter((b) => b.status === "PENDING_REVIEW");
  const approved = items.filter((b) => b.status === "APPROVED");
  const suspended = items.filter((b) => b.status === "SUSPENDED");

  return (
    <div className="space-y-8">
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-yellow-700 mb-3">
            Pending Review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((biz) => (
              <BusinessCard
                key={biz.id}
                business={biz}
                loading={loading === biz.id}
                onApprove={() => handleAction(biz.id, "APPROVED")}
                onSuspend={() => handleAction(biz.id, "SUSPENDED")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-green-700 mb-3">
            Approved ({approved.length})
          </h2>
          <div className="space-y-3">
            {approved.map((biz) => (
              <BusinessCard
                key={biz.id}
                business={biz}
                loading={loading === biz.id}
                onSuspend={() => handleAction(biz.id, "SUSPENDED")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suspended */}
      {suspended.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-red-700 mb-3">
            Suspended ({suspended.length})
          </h2>
          <div className="space-y-3">
            {suspended.map((biz) => (
              <BusinessCard
                key={biz.id}
                business={biz}
                loading={loading === biz.id}
                onApprove={() => handleAction(biz.id, "APPROVED")}
              />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No businesses registered yet.
        </p>
      )}
    </div>
  );
}

function BusinessCard({
  business,
  loading,
  onApprove,
  onSuspend,
}: {
  business: Business;
  loading: boolean;
  onApprove?: () => void;
  onSuspend?: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{business.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[business.status]}`}
              >
                {business.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {business.category}
              {business.city ? ` - ${business.city}` : ""}
              {" | "}
              {business.productCount} products
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Owner: {business.ownerName || business.ownerEmail} |{" "}
              {new Date(business.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {onApprove && (
              <Button
                size="sm"
                onClick={onApprove}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
            )}
            {onSuspend && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onSuspend}
                disabled={loading}
              >
                Suspend
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
