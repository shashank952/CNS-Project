import styles from './OperationTable.module.css'
import { formatOperation, formatResult } from '../lib/labels.js'

export default function OperationTable({ records }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Operation</th>
            <th scope="col">Result</th>
            <th scope="col">When</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.document_filename}</td>
              <td>{formatOperation(record.operation_type)}</td>
              <td>
                <span
                  className={
                    record.result === 'success'
                      ? styles.success
                      : styles.failure
                  }
                >
                  {formatResult(record.result)}
                </span>
              </td>
              <td>
                <time dateTime={record.created_at}>
                  {new Date(record.created_at).toLocaleString()}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
