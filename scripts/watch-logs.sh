#!/usr/bin/env bash
set -eu

function format_logs() {
  local level timestamp data

  while read -r level timestamp data; do
    [[ $level == timestamp ]] && continue
    [[ $level == ERROR ]] && read -r function data <<< "$data"
    printf "%s\t%s\t%s%s\n" "$(gdate -d "$timestamp" +"%F %T.%3N")" "$level" "${function:+$function$'\t'}" \
      "$(jq --raw-output .message <<< "$data" 2> /dev/null || echo "$data")"
    unset function
  done
}

clasp logs --watch | format_logs
