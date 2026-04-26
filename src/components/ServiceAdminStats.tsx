import type { ModelService as Service } from "../types/organizations.generated";
import StatCard from "./StatCard";
import ChartSection from "./ChartSection";
import { ServicesMonthlyBarChart } from "./charts/ServicesMonthlyBarChart";

export default function ServiceAdminStats({ services }: { services: Service[] }) {
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Service Provider Accounts"
          value={services.length}
          sub="registered in your organisation"
          accent="var(--chart-3)"
        />
      </div>

      <ChartSection title="Services Offered per Month">
        <ServicesMonthlyBarChart services={services} />
      </ChartSection>
    </div>
  );
}
