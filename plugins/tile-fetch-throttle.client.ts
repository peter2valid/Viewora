import { installTileFetchThrottle } from '~/shared/utils/viewerAdapters/psvAdapter'

// Install the tile fetch throttle at app startup so it is guaranteed to be in
// place before any prefetch or viewer init can fire tile requests — regardless
// of the order in which viewer components mount.
installTileFetchThrottle()
