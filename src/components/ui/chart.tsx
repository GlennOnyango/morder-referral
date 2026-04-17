import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

// ── Config ──────────────────────────────────────────────────────────────────

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within a <ChartContainer />");
  return ctx;
}

// ── Container ────────────────────────────────────────────────────────────────

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        id={chartId}
        className={cn(
          "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const vars = Object.entries(config)
    .filter(([, cfg]) => cfg.color)
    .map(([key, cfg]) => `--color-${key}:${cfg.color}`)
    .join(";");
  if (!vars) return null;
  return <style>{`#${id}{${vars}}`}</style>;
};

// ── Tooltip ──────────────────────────────────────────────────────────────────

// recharts passes these at runtime via the `content` render prop
type TooltipPayloadItem = {
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
  payload?: Record<string, unknown>;
};

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  nameKey?: string;
  className?: string;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  hideIndicator = false,
  nameKey,
  className,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!hideLabel && label && (
        <div className="font-medium">
          {config[label]?.label ?? label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = nameKey ?? String(item.dataKey ?? item.name ?? "value");
          const cfg = config[key];
          const indicatorColor = item.fill ?? item.color;

          return (
            <div key={index} className="flex w-full items-center gap-2">
              {!hideIndicator && (
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: indicatorColor }}
                />
              )}
              <div className="flex flex-1 items-center justify-between">
                <span className="text-muted-foreground">
                  {cfg?.label ?? item.name ?? key}
                </span>
                {item.value !== undefined && (
                  <span className="font-mono font-medium tabular-nums">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : item.value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

// ── Legend ───────────────────────────────────────────────────────────────────

type LegendPayloadItem = {
  value?: string;
  color?: string;
  dataKey?: string | number;
};

type ChartLegendContentProps = {
  payload?: LegendPayloadItem[];
  verticalAlign?: "top" | "bottom" | "middle";
  hideIcon?: boolean;
  nameKey?: string;
  className?: string;
};

function ChartLegendContent({
  payload,
  verticalAlign = "bottom",
  hideIcon = false,
  nameKey,
  className,
}: ChartLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item, index) => {
        const key = nameKey ?? String(item.dataKey ?? item.value ?? "");
        const cfg = config[key] ?? config[String(item.value ?? "")];

        return (
          <div key={index} className="flex items-center gap-1.5">
            {cfg?.icon && !hideIcon ? (
              <cfg.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-xs"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-muted-foreground text-xs">
              {cfg?.label ?? item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
