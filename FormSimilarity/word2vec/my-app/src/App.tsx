import React, { FC, useEffect, useCallback } from 'react';
import logo from './logo.svg';
import './App.css';
import { VictoryChart } from 'victory-chart';
import { VictoryScatter, VictoryTheme,
  VictoryTooltip, VictoryZoomContainer
} from 'victory';

import data from './emb_para_vecs.json';

const Tooltip: FC<{}> = ({}) => {
  return <div>Hello, World</div>
}

type Table = {
  tableId: number,
  name: string,
  columns: string[]
};

const EntityView: FC<{table: Table}> = ({table}) => {
  return (<div className='entity-view'>
    <table>
      <thead>
        <tr><th>{table.name}</th><th>{table.tableId}</th></tr>
      </thead>
      <tbody>
        {
          table.columns.map((_, index) => {
            return <tr key={index}><td>{_}</td></tr>
          })
        }
      </tbody>
    </table>
  </div>)
}

function App() {
  
  const [externalMutations, setExternalMutations] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState(new Set<number>([106, 107]));
  const [detailedTableId, setDetailedTableId] = React.useState<number | null>(104);

  const handleOnSelect = useCallback(() => {
    setSelectedIds(new Set<number>());
  }, []);

  const ScatterPoint = ({ x, y, datum }: { x: number, y: number, datum: any}) => {
    // const [selected, setSelected] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const [selected, setSelected] = React.useState(false);
    const tableId = datum.tableId;
    
    useEffect(() => {
      setSelected(selectedIds.has(tableId));
    }, [tableId, selectedIds])
    
    const handleOnScatterPointClick = useCallback(() => {
      if (selectedIds.has(tableId)) {
        //@ts-ignore
        setSelectedIds(new Set<number>([...selectedIds].filter(_ => _ != tableId)));
        setDetailedTableId(null);
      } else {
        setDetailedTableId(tableId);
        setSelectedIds(selectedIds.add(tableId));
      }
    }, [selected, selectedIds]);

    return (
      <g 
        onClick={() => handleOnScatterPointClick()}
      >
        <circle
          cx={x}
          cy={y}
          r={5}
          stroke={hovered ? "#21130d" : "#21130d"}
          strokeWidth={hovered ? 2 : 1}
          fill={selected ? "#fd7636" : "#1e81b0"}
          opacity={0.8}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
        <text x={x} y={y}>{datum.tableId}</text>
      </g>
      
    );
  };

  const handleOnReset = useCallback(() => {
  }, [])

  const detailedTable = data['pvecs'].find(_ => _.tableId === detailedTableId);
  return (
    <div className="App">
      <div className="container">
        <VictoryChart
          theme={VictoryTheme.material}
          domain={{ x: [-60., 60.], y: [-60., 60.] }}
          containerComponent={
            <VictoryZoomContainer/>
          }
        >
          <VictoryScatter
            style={{ data: { fill: "#c43a31" } }}
            size={7}
            data={data['pvecs']}
            externalEventMutations={externalMutations}
            dataComponent={
              //@ts-ignore
              <ScatterPoint />
            }
            labels={(_) => `${_?.datum.table}`}
            labelComponent={
              <VictoryTooltip
                  flyoutHeight={10}
                />}
            events={[
              {
                target: "data",
                eventHandlers: {
                  onClick: (_) => {
                    console.log(_);
                  }
                }
              }
            ]}
          />
        </VictoryChart>
      <div className='entity-gallery'>
        {
          data['pvecs']
            .filter(_ => selectedIds.has(_.tableId))
            .map((_, index) => {
              return <EntityView key={index} table={{name: _.table, tableId: _.tableId, columns: _.columns}}/>
            })
        }
        </div>
      </div>
    </div>
  );
}

export default App;
