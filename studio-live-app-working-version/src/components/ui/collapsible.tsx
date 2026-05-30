
"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { Slot } from "@radix-ui/react-slot" // Import Slot

// Collapsible Root does NOT forward asChild - it renders its own div which can handle data-state
const CollapsibleRoot = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>(({ ...props }, ref) => {
  return <CollapsiblePrimitive.Root ref={ref} {...props} />;
});
CollapsibleRoot.displayName = "Collapsible";

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

// Modified CollapsibleContent to accept and forward asChild
const CollapsibleContentPrimitive = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => {
   // Pass asChild to the Radix Primitive Content
   return <CollapsiblePrimitive.Content ref={ref} asChild={asChild} {...props} />;
});
CollapsibleContentPrimitive.displayName = CollapsiblePrimitive.Content.displayName;


// Re-export with potentially modified names if needed, or keep original names
const Collapsible = CollapsibleRoot;
const CollapsibleContent = CollapsibleContentPrimitive;


export { Collapsible, CollapsibleTrigger, CollapsibleContent }
