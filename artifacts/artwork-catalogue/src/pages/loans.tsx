import { useState } from "react";
import { useListLoans, useGetUpcomingReturns, useUpdateArtworkLoan, getListLoansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "wouter";
import { CalendarClock, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Loan = {
  id: number;
  artworkId: number;
  artworkTitle: string;
  artworkArtist: string | null;
  artworkImageUrl: string | null;
  loanee: string | null;
  institution: string | null;
  purpose: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  notes: string | null;
  daysUntilReturn: number | null;
};

function StatusBadge({ loan }: { loan: Loan }) {
  if (loan.status === "returned") {
    return <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-muted-foreground">Returned</Badge>;
  }
  if (loan.status === "overdue" || (loan.daysUntilReturn !== null && loan.daysUntilReturn < 0)) {
    return <Badge variant="destructive" className="text-[10px] uppercase tracking-widest">Overdue</Badge>;
  }
  if (loan.daysUntilReturn !== null && loan.daysUntilReturn <= 7) {
    return <Badge className="text-[10px] uppercase tracking-widest bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/10">Due soon</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-emerald-600 border-emerald-600/30">Active</Badge>;
}

function DaysCountdown({ loan }: { loan: Loan }) {
  if (!loan.endDate || loan.status === "returned") return null;
  const days = loan.daysUntilReturn;
  if (days === null) return null;

  if (days < 0) {
    return <span className="text-xs text-red-500 font-medium">{Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""} overdue</span>;
  }
  if (days === 0) {
    return <span className="text-xs text-amber-600 font-medium">Due today</span>;
  }
  const color = days <= 7 ? "text-amber-600" : days <= 30 ? "text-amber-500/80" : "text-emerald-600/80";
  return <span className={`text-xs font-medium ${color}`}>{days} day{days !== 1 ? "s" : ""} remaining</span>;
}

function LoanRow({ loan, onReturn }: { loan: Loan; onReturn: (id: number, artworkId: number) => void }) {
  return (
    <div className="flex items-start gap-4 py-5 border-b border-border last:border-0 group" data-testid={`loan-row-${loan.id}`}>
      <div className="h-14 w-14 bg-muted/30 flex-shrink-0 overflow-hidden">
        {loan.artworkImageUrl ? (
          <img src={loan.artworkImageUrl} alt={loan.artworkTitle} className="object-cover w-full h-full" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/artworks/${loan.artworkId}`} className="font-serif text-sm hover:text-primary transition-colors">
              {loan.artworkTitle}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">{loan.artworkArtist || "Unknown Artist"}</p>
          </div>
          <StatusBadge loan={loan} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          {loan.loanee && (
            <span className="text-xs text-muted-foreground"><span className="text-foreground/60">To:</span> {loan.loanee}</span>
          )}
          {loan.institution && (
            <span className="text-xs text-muted-foreground"><span className="text-foreground/60">Institution:</span> {loan.institution}</span>
          )}
          {loan.startDate && (
            <span className="text-xs text-muted-foreground"><span className="text-foreground/60">From:</span> {loan.startDate}</span>
          )}
          {loan.endDate && (
            <span className="text-xs text-muted-foreground"><span className="text-foreground/60">Until:</span> {loan.endDate}</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-4">
          <DaysCountdown loan={loan} />
          {loan.notes && <span className="text-xs text-muted-foreground/70 truncate max-w-xs">{loan.notes}</span>}
        </div>
      </div>
      {loan.status === "active" && (
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
          onClick={() => onReturn(loan.id, loan.artworkId)}
          data-testid={`button-return-loan-${loan.id}`}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Mark returned
        </Button>
      )}
    </div>
  );
}

export default function Loans() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allLoans, isLoading } = useListLoans();
  const { data: upcoming } = useGetUpcomingReturns({ daysAhead: 30 });
  const updateLoan = useUpdateArtworkLoan();

  const handleReturn = (loanId: number, artworkId: number) => {
    updateLoan.mutate(
      { id: artworkId, loanId, data: { status: "returned" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
          toast({ title: "Loan marked as returned" });
        },
      },
    );
  };

  const activeLoans = (allLoans || []).filter(l => l.status === "active" || l.status === "overdue");
  const returnedLoans = (allLoans || []).filter(l => l.status === "returned");
  const overdueLoans = (allLoans || []).filter(l => l.status === "overdue");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-serif tracking-tight">Loans</h1>
        <p className="text-muted-foreground mt-1 font-light">Outgoing loans and return schedules.</p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="border-t border-border pt-4">
          <p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">Active Loans</p>
          <p className="text-3xl font-serif">{activeLoans.length}</p>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">Returning soon</p>
          <p className="text-3xl font-serif">{(upcoming || []).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">within 30 days</p>
        </div>
        <div className={`border-t pt-4 ${overdueLoans.length > 0 ? "border-red-300" : "border-border"}`}>
          <p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">Overdue</p>
          <p className={`text-3xl font-serif ${overdueLoans.length > 0 ? "text-red-500" : ""}`}>{overdueLoans.length}</p>
        </div>
      </div>

      {overdueLoans.length > 0 && (
        <div className="border border-red-200 bg-red-50/50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            {overdueLoans.length} loan{overdueLoans.length > 1 ? "s are" : " is"} overdue and require attention.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {!isLoading && (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="border-b border-border bg-transparent p-0 h-auto gap-6 rounded-none justify-start">
            <TabsTrigger value="active" className="pb-3 px-0 rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              Active ({activeLoans.length})
            </TabsTrigger>
            <TabsTrigger value="returned" className="pb-3 px-0 rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              Returned ({returnedLoans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
            {activeLoans.length === 0 ? (
              <div className="text-center py-16">
                <CalendarClock className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground text-sm">No active loans</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Loans can be added from an artwork's record</p>
              </div>
            ) : (
              <div>
                {activeLoans.map(loan => (
                  <LoanRow key={loan.id} loan={loan as Loan} onReturn={handleReturn} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="returned" className="mt-0">
            {returnedLoans.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-sm">No returned loans</p>
              </div>
            ) : (
              <div>
                {returnedLoans.map(loan => (
                  <LoanRow key={loan.id} loan={loan as Loan} onReturn={handleReturn} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
