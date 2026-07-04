import { useGraiBossUrls } from '../hooks/useGraiTokenMetadata'
import { useBossEndpointProbes } from '../hooks/useBossEndpointProbes'

export function BossEndpointsTable() {
  const metadata = useGraiBossUrls()
  const probes = useBossEndpointProbes(metadata.bossUrls, metadata.status === 'ready')

  const isLoadingMetadata = metadata.status === 'loading'
  const metadataError = metadata.status === 'error' ? metadata.message : null
  const rows = probes.rows

  return (
    <div className="grai-boss-endpoints">
      <p className="grai-boss-endpoints-lead">Read endpoints from GRAI</p>
      <div className="grai-boss-endpoints-table-wrap" role="region" aria-label="Read endpoints from GRAI">
        <table className="grai-boss-endpoints-table">
          <thead>
            <tr>
              <th scope="col">Health</th>
              <th scope="col">URI</th>
              <th scope="col">Meta name</th>
              <th scope="col">Grinders max</th>
              <th scope="col">Auth</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingMetadata && (
              <tr>
                <td colSpan={5}>
                  <span className="grai-boss-endpoints-status" role="status">
                    Loading GRAI metadata…
                  </span>
                </td>
              </tr>
            )}

            {!isLoadingMetadata && metadataError && (
              <tr>
                <td colSpan={5}>
                  <span className="grai-boss-endpoints-status is-error" role="status">
                    {metadataError}
                  </span>
                </td>
              </tr>
            )}

            {!isLoadingMetadata && !metadataError && rows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <span className="grai-boss-endpoints-status" role="status">
                    No boss URLs in GRAI metadata.
                  </span>
                </td>
              </tr>
            )}

            {!isLoadingMetadata &&
              !metadataError &&
              rows.map((row) => (
                <tr key={row.uri} className={row.status === 'error' ? 'is-unreachable' : undefined}>
                  <td>
                    <code
                      className={`grai-boss-endpoint-health${row.status === 'error' ? ' is-error' : ''}`}
                      title={row.error}
                    >
                      {row.health}
                    </code>
                  </td>
                  <td>
                    <code className="grai-boss-endpoint-uri">{row.uri}</code>
                  </td>
                  <td>
                    <span className="grai-boss-endpoint-meta-cell">
                      <code className="grai-boss-endpoint-meta-name">{row.metaName}</code>
                    </span>
                  </td>
                  <td>
                    <code className="grai-boss-endpoint-grinders-max">{row.grindersMax}</code>
                  </td>
                  <td>{row.authLabel}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
