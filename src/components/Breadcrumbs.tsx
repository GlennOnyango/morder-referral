import { Fragment } from "react";
import { Link } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
  ariaLabel?: string;
};

function Breadcrumbs({ items, className, ariaLabel = "Breadcrumb" }: BreadcrumbsProps) {
  const navClassName = className ? `org-breadcrumbs ${className}` : "org-breadcrumbs";

  return (
    <nav className={navClassName} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const canLink = Boolean(item.to) && !isLast;

        return (
          <Fragment key={`${item.label}-${index}`}>
            {canLink ? (
              <Link className="org-breadcrumb-link" to={item.to!}>
                {item.label}
              </Link>
            ) : (
              <span className="org-breadcrumb-current" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}

            {!isLast ? <span className="org-breadcrumb-separator">/</span> : null}
          </Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
