import { BOSS_ENDPOINT_EXAMPLE, bossEndpointAuthLabel } from '../boss/bossEndpoints'

export function BossEndpointsTable() {
  const row = BOSS_ENDPOINT_EXAMPLE

  return (
    <div className="grai-boss-endpoints">
      <p className="grai-boss-endpoints-lead">Read endpoints from GRAI</p>
      <div className="grai-boss-endpoints-table-wrap" role="region" aria-label="Read endpoints from GRAI">
        <table className="grai-boss-endpoints-table">
          <thead>
            <tr>
              <th scope="col">Meta name</th>
              <th scope="col">URI</th>
              <th scope="col">Auth</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="grai-boss-endpoint-meta-cell">
                  <code className="grai-boss-endpoint-meta-name">{row.metaName}</code>
                </span>
              </td>
              <td>
                <code className="grai-boss-endpoint-uri">{row.uri}</code>
              </td>
              <td>{bossEndpointAuthLabel(row.auth)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
