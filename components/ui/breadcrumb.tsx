"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils"; // Assuming you have a cn utility

const BreadcrumbContext = React.createContext<{ isLastChild?: boolean }>({});

/**
 * Breadcrumb component to display a breadcrumb trail.
 * @param {React.HTMLAttributes<HTMLElement>} props - Props for the nav element.
 * @returns JSX.Element
 */
const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav">
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = "Breadcrumb";

/**
 * BreadcrumbList component to contain breadcrumb items.
 * @param {React.HTMLAttributes<HTMLOListElement>} props - Props for the ol element.
 * @returns JSX.Element
 */
const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

/**
 * BreadcrumbItem component for individual breadcrumb items.
 * @param {React.HTMLAttributes<HTMLLIElement>} props - Props for the li element.
 * @returns JSX.Element
 */
const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, children, ...props }, ref) => {
  const childrenArray = React.Children.toArray(children);
  const lastChild = childrenArray[childrenArray.length - 1];

  return (
    <li
      ref={ref}
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}>
      <BreadcrumbContext.Provider value={{ isLastChild: true }}>
        {React.Children.map(children, (child, index) => {
          if (index === childrenArray.length - 1) {
            return child;
          }
          return (
            <BreadcrumbContext.Provider value={{ isLastChild: false }}>
              {child}
            </BreadcrumbContext.Provider>
          );
        })}
      </BreadcrumbContext.Provider>
    </li>
  );
});
BreadcrumbItem.displayName = "BreadcrumbItem";

/**
 * BreadcrumbLink component for clickable breadcrumb items.
 * @param {object} props - Props for the component.
 * @param {boolean} [props.asChild] - Whether to render as a child component.
 * @param {string} [props.className] - Additional class names.
 * @param {React.ReactNode} props.children - The content of the link.
 * @returns JSX.Element
 */
const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const { isLastChild } = React.useContext(BreadcrumbContext);
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      className={cn(
        "transition-colors hover:text-foreground",
        isLastChild && "font-semibold text-foreground",
        className
      )}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

/**
 * BreadcrumbPage component for the current page in the breadcrumb trail.
 * @param {React.HTMLAttributes<HTMLSpanElement>} props - Props for the span element.
 * @returns JSX.Element
 */
const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

/**
 * BreadcrumbSeparator component to display a separator between breadcrumb items.
 * @param {React.HTMLAttributes<HTMLLIElement>} props - Props for the li element.
 * @returns JSX.Element
 */
const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ children, className, ...props }, ref) => (
  <li
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:size-3.5", className)}
    {...props}>
    {children ?? <ChevronRightIcon />}
  </li>
));
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

/**
 * BreadcrumbEllipsis component for displaying an ellipsis in the breadcrumb trail.
 * @param {React.HTMLAttributes<HTMLSpanElement>} props - Props for the span element.
 * @returns JSX.Element
 */
const BreadcrumbEllipsis = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}>
    <MoreHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
));
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

// Helper Icon for Ellipsis (can be replaced or moved)
function MoreHorizontalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
