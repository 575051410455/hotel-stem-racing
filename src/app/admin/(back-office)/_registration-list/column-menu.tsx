"use client";

import type { ColumnVisibilityState } from "@tanstack/react-table";
import { Columns3Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { columnLabel, type RegistrationListTable } from "./columns";

/**
 * "คอลัมน์": hides and shows the list's columns, one checkbox item per column the table lets
 * Staff hide (not the detail link). Choosing an item keeps the menu open, so several columns can
 * be hidden in one go; Escape or a click outside closes it. `columnVisibility` is the table's
 * current visibility, passed in so the menu re-renders when it changes.
 */
export function ColumnMenu({
  table,
  columnVisibility,
}: {
  table: RegistrationListTable;
  columnVisibility: ColumnVisibilityState;
}) {
  const hideableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Columns3Icon aria-hidden="true" />
          คอลัมน์
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            // Only an explicit `false` hides a column; a column not in the state is shown.
            checked={columnVisibility[column.id] !== false}
            onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
            onSelect={(selectEvent) => selectEvent.preventDefault()}
          >
            {columnLabel(column)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
