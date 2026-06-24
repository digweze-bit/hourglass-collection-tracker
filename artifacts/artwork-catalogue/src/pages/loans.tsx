import { useListLoans, useUpdateLoan } from "@/hooks/use-db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "wouter";
import { CalendarClock, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Loans() {
  const { toast } = useToast();
  const { data: allLoans, isLoading } = useListLoans();
  const updateLoan = useUpdateLoan();

  const handleReturn = (loanId: string, artworkId: string) => {
    updateLoan.mutate({ id: loanId, artworkId, data: { status: "returned" } }, {
      onSuccess: () => toast({ title: "Loan marked as returned" }),
    });
  };

  const activeLoans = (allLoans || []).filter((l: any) => l.status === "active");
  const returnedLoans = (allLoans || []).filter((l: any) => l.status === "returned");
  const overdueLoans = (allLoans || []).filter((l: any) => l.days_until_return !== null && l.days_until_return !== undefined && l.days_until_return < 0 && l.status === "active");
  const upcomingCount = (allLoans || []).filter((l: any) => l.status === "active" && l.days_until_return !== null && l.days_until_return !== undefined && l.days_until_return >= 0 && l.days_until_return <= 30).length;

  return (
    <div className="space-y-10">
      <header><h1 className="text-3xl font-serif tracking-tight">Loans</h1><p className="text-muted-foreground mt-1 font-light">Outgoing loans and return schedules.</p></header>
      <div className="grid grid-cols-3 gap-6">
        <div className="border-t border-border pt-4"><p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">Active Loans</p><p className="text-3xl font-serif">{activeLoans.length}</p></div>
        <div className="border-t border-border pt-4"><p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">Returning soon</p><p className="text-3xl font-serif">{upcomingCount}</p><p className="text-xs text-muted-foreground mt-0.5">within 30 days</p></div>
        <div className={`border-t pt-4 ${overdueLoans.length > 0 ? "border-red-300" : "border-border"}`}><p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">Overdue</p><p className={`text-3xl font-serif ${overdueLoans.length > 0 ? "text-red-500" : ""}`}>{overdueLoans.length}</p></div>
      </div>
      {overdueLoans.length > 0 && <div className="border border-red-200 bg-red-50/50 px-4 py-3 flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0"/><p className="text-sm text-red-700">{overdueLoans.length} loan{overdueLoans.length > 1 ? "s are" : " is"} overdue.</p></div>}
      {isLoading && <div className="space-y-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-20 w-full"/>)}</div>}
      {!isLoading && (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="border-b border-border bg-transparent p-0 h-auto gap-6 rounded-none justify-start">
            <TabsTrigger value="active" className="pb-3 px-0 rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Active ({activeLoans.length})</TabsTrigger>
            <TabsTrigger value="returned" className="pb-3 px-0 rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">Returned ({returnedLoans.length})</TabsTrigger>
          </TabsList>
          {(["active","returned"] as const).map(tab => (
            <TabsContent key={tab} value={tab} className="mt-0">
              {(tab === "active" ? activeLoans : returnedLoans).length === 0 ? (
                <div className="text-center py-16"><CalendarClock className="h-8 w-8 mx-auto mb-3 opacity-20"/><p className="text-muted-foreground text-sm">No {tab} loans</p></div>
              ) : (
                <div>
                  {(tab === "active" ? activeLoans : returnedLoans).map((loan: any) => {
                    const days = loan.days_until_return;
                    const isOverdue = days !== null && days !== undefined && days < 0 && loan.status === "active";
                    return (
                      <div key={loan.id} className="flex items-start gap-4 py-5 border-b border-border last:border-0 group">
                        <div className="h-14 w-14 bg-muted/30 flex-shrink-0 overflow-hidden">{loan.artwork_image_url && <img src={loan.artwork_image_url} alt={loan.artwork_title} className="object-cover w-full h-full"/>}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <Link href={`/artworks/${loan.artwork_id}`} className="font-serif text-sm hover:text-primary transition-colors">{loan.artwork_title}</Link>
                              <p className="text-xs text-muted-foreground mt-0.5">{loan.artwork_artist || "Unknown Artist"}</p>
                            </div>
                            {loan.status === "returned" ? <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-muted-foreground">Returned</Badge> :
                              isOverdue ? <Badge variant="destructive" className="text-[10px] uppercase tracking-widest">Overdue</Badge> :
                              <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-emerald-600 border-emerald-600/30">Active</Badge>}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                            {loan.loanee && <span className="text-xs text-muted-foreground">To: {loan.loanee}</span>}
                            {loan.institution && <span className="text-xs text-muted-foreground">Institution: {loan.institution}</span>}
                            {loan.start_date && <span className="text-xs text-muted-foreground">From: {loan.start_date}</span>}
                            {loan.end_date && <span className="text-xs text-muted-foreground">Until: {loan.end_date}</span>}
                          </div>
                          {days !== null && days !== undefined && loan.status === "active" && (
                            <p className={`text-xs font-medium mt-1 ${isOverdue ? "text-red-500" : days <= 7 ? "text-amber-600" : "text-emerald-600/80"}`}>
                              {isOverdue ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
                            </p>
                          )}
                        </div>
                        {loan.status === "active" && (
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground flex-shrink-0" onClick={() => handleReturn(loan.id, loan.artwork_id)}>
                            <CheckCircle className="h-3 w-3 mr-1"/>Mark returned
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
