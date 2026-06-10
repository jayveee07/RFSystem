import React, { createContext, useContext } from 'react'

const ReadOnlyContext = createContext<boolean>(false)

export function ReadOnlyProvider({ readOnly, children }: { readOnly: boolean; children: React.ReactNode }) {
  return <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>
}

export function useReadOnly() {
  return useContext(ReadOnlyContext)
}

