"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { Slot } from "@radix-ui/react-slot" // Import Slot

// Modified Collapsible to accept asChild
const CollapsibleRoot = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : CollapsiblePrimitive.Root;
  return <Comp ref={ref} {...props} />;
});
CollapsibleRoot.displayName = "Collapsible";

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

// Modified CollapsibleContent to accept asChild
const CollapsibleContentPrimitive = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => {
   const Comp = asChild ? Slot : CollapsiblePrimitive.Content;
   return <Comp ref={ref} {...props} />;
});
CollapsibleContentPrimitive.displayName = CollapsiblePrimitive.Content.displayName;


// Re-export with potentially modified names if needed, or keep original names
const Collapsible = CollapsibleRoot;
const CollapsibleContent = CollapsibleContentPrimitive;


export { Collapsible, CollapsibleTrigger, CollapsibleContent }
