
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

import { getBuildings } from '@/lib/services/buildings';
import { subscribeToReports } from '@/lib/services/reports';
import type {
    CampusBuilding,
    CampusReport,
} from '@/types/models';

const CAMPUS_REGION = {
  latitude: 12.9230,
  longitude: 77.5000,
  latitudeDelta: 0.004,
  longitudeDelta: 0.004,
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

export default function CampusMapScreen() {
  const [buildings, setBuildings] = useState<CampusBuilding[]>([]);
  const [reports, setReports] = useState<CampusReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadBuildings() {
      try {
        const result = await getBuildings();

        if (mounted) {
          setBuildings(result);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load campus buildings.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadBuildings();

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToReports(
        (updatedReports) => {
          if (mounted) {
            setReports(updatedReports);
          }
        },
        (subscriptionError) => {
          if (mounted) {
            setError(subscriptionError.message);
          }
        }
      );
    } catch (err) {
      if (mounted) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load campus reports.'
        );
      }
    }

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  // Use the report's own coordinates when available.
  // Older reports can fall back to their selected building's coordinates.
  const reportMarkers = useMemo(() => {
    return reports
      .map((report) => {
        const building = buildings.find(
          (item) => item.id === report.buildingId
        );

        const latitude =
          report.location?.latitude ?? building?.latitude;

        const longitude =
          report.location?.longitude ?? building?.longitude;

        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        return {
          report,
          latitude,
          longitude,
        };
      })
      .filter(
        (
          item
        ): item is {
          report: CampusReport;
          latitude: number;
          longitude: number;
        } => item !== null
      );
  }, [reports, buildings]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Campus Map</Text>
          <Text style={styles.subtitle}>
            Explore RV University and campus reports
          </Text>
        </View>

        <Pressable
          style={styles.reportButton}
          onPress={() => router.push('/create-report')}
        >
          <Text style={styles.reportButtonText}>+ Report</Text>
        </Pressable>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.buildingDot} />
          <Text style={styles.legendText}>Buildings</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={styles.reportDot} />
          <Text style={styles.legendText}>Reports</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3457D5" />
          <Text style={styles.loadingText}>
            Loading campus map...
          </Text>
        </View>
      ) : (
        <>
          <MapView
            style={styles.map}
            initialRegion={CAMPUS_REGION}
            mapType="standard"
            showsCompass
            showsScale
            toolbarEnabled
          >
            {buildings.map((building) => {
              if (
                !Number.isFinite(building.latitude) ||
                !Number.isFinite(building.longitude)
              ) {
                return null;
              }

              return (
                <Marker
                  key={`building-${building.id}`}
                  coordinate={{
                    latitude: building.latitude,
                    longitude: building.longitude,
                  }}
                  pinColor="#3457D5"
                  title={building.name}
                  description={building.description}
                >
                  <Callout>
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>
                        {building.name}
                      </Text>
                      <Text style={styles.calloutDescription}>
                        {building.description}
                      </Text>
                      <Text style={styles.calloutType}>
                        Campus building
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}

            {reportMarkers.map(
              ({ report, latitude, longitude }) => (
                <Marker
                  key={`report-${report.id}`}
                  coordinate={{ latitude, longitude }}
                  pinColor="#E05A47"
                  title={report.title}
                  description={formatStatus(report.status)}
                >
                  <Callout
                    onPress={() =>
                      router.push({
                        pathname: '/report/[id]',
                        params: { id: report.id },
                      })
                    }
                  >
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>
                        {report.title}
                      </Text>
                      <Text style={styles.calloutDescription}>
                        {report.description}
                      </Text>
                      <Text style={styles.calloutType}>
                        {formatStatus(report.status)} · Tap to view
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              )
            )}
          </MapView>

          <View style={styles.mapFooter}>
            <Text style={styles.footerText}>
              {buildings.length} buildings · {reportMarkers.length} mapped reports
            </Text>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.footerHint}>
                Tap a marker to see more information.
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 25,
    fontWeight: '800',
    color: '#172033',
  },
  subtitle: {
    fontSize: 13,
    color: '#707A8A',
    marginTop: 4,
  },
  reportButton: {
    backgroundColor: '#3457D5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  buildingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3457D5',
  },
  reportDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E05A47',
  },
  legendText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  mapFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 13,
    color: '#273247',
    fontWeight: '700',
  },
  footerHint: {
    fontSize: 12,
    color: '#707A8A',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#B42318',
    marginTop: 4,
  },
  callout: {
    width: 210,
    padding: 5,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  calloutType: {
    fontSize: 11,
    color: '#3457D5',
    fontWeight: '700',
    marginTop: 7,
  },
});
