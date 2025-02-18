import { Alert, CheckboxInput, Collapse, TabButton, TabButtons } from '@koyeb/design-system';
import { CatalogRegion, RegionScope } from 'src/api/model';
import { RegionFlag } from 'src/components/region-flag';
import { useRegionLatency } from 'src/hooks/region-latency';
import { createTranslate } from 'src/intl/translate';

const T = createTranslate('components.instanceSelector.new');

const scopes: RegionScope[] = ['metropolitan', 'continental'];

type RegionSelectorProps = {
  expanded: boolean;
  regions: CatalogRegion[];
  selected: CatalogRegion[];
  onSelected: (selected: CatalogRegion) => void;
  scope: RegionScope | null;
  onScopeChanged: (scope: RegionScope) => void;
};

export function RegionSelector({
  expanded,
  regions,
  selected,
  onSelected,
  scope: currentScope,
  onScopeChanged,
}: RegionSelectorProps) {
  return (
    <Collapse open={expanded}>
      <div className="row mb-2 mt-4 items-center justify-between">
        <div className="text-dim">
          <T id="regions.label" />
        </div>

        {currentScope !== null && (
          <TabButtons size={1} className="w-full">
            {scopes.map((scope) => (
              <TabButton
                key={scope}
                size={1}
                selected={currentScope === scope}
                onClick={() => onScopeChanged(scope)}
              >
                <T id={`regionScope.${scope}`} />
              </TabButton>
            ))}
          </TabButtons>
        )}
      </div>

      <ul className="row flex-wrap justify-start gap-4">
        {regions.map((region) => (
          <li key={region.identifier} className="w-56">
            <RegionItem
              region={region}
              selected={selected.includes(region)}
              onSelected={() => onSelected(region)}
            />
          </li>
        ))}

        {/* todo: empty state */}
        {regions.length === 0 && <>No region available</>}
      </ul>

      {selected.length === 0 && (
        <Alert variant="error" description={<T id="regions.noRegionSelected" />} className="mt-4" />
      )}
    </Collapse>
  );
}

type RegionItemProps = {
  region: CatalogRegion;
  selected: boolean;
  onSelected: () => void;
};

function RegionItem({ region, selected, onSelected }: RegionItemProps) {
  return (
    <label className="row cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 has-[:checked]:border-green">
      <RegionFlag identifier={region.identifier} className="size-6" />

      <div className="flex-1">
        <div className="leading-none">{region.displayName}</div>
        <RegionLatency region={region} />
      </div>

      <CheckboxInput checked={selected} onChange={onSelected} />
    </label>
  );
}

function RegionLatency({ region }: { region: CatalogRegion }) {
  const latency = useRegionLatency(region);

  if (region === null) {
    return null;
  }

  return (
    <div className="mt-1 text-xs leading-none text-dim">
      {latency === undefined && <T id="regions.checkingLatency" />}
      {latency !== undefined && <T id="regions.latency" values={{ value: latency }} />}
    </div>
  );
}
