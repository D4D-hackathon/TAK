<template>
    <div>
        <div class='card-header d-flex'>
            <h3 class='card-title'>
                Files
            </h3>

            <div class='ms-auto btn-list'>
                <TablerRefreshButton
                    title='Refresh'
                    :loading='loading'
                    @click='fetchList'
                />
            </div>
        </div>

        <div class='card-body'>
            <TablerAlert
                v-if='error'
                title='File Error'
                :err='error'
                :compact='true'
            />
            <TablerLoading v-else-if='loading' />
            <TablerNone
                v-else-if='!assets.length'
                :create='false'
                :compact='true'
                label='No Files'
            />
            <div
                v-else
                class='table-responsive'
            >
                <table class='table table-hover table-vcenter card-table'>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Size</th>
                            <th>Sync</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='asset in assets'
                            :key='asset.name'
                        >
                            <td v-text='asset.name' />
                            <td>
                                <TablerBytes :bytes='asset.size' />
                            </td>
                            <td>
                                <IconCheck
                                    v-if='asset.sync'
                                    v-tooltip='"Mission Sync"'
                                    :size='32'
                                    stroke='1'
                                    class='text-green'
                                />
                                <IconX
                                    v-else
                                    v-tooltip='"Not Synced"'
                                    :size='32'
                                    stroke='1'
                                    class='text-muted'
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { server } from '../../../std.ts';
import {
    TablerAlert,
    TablerBytes,
    TablerLoading,
    TablerNone,
    TablerRefreshButton,
} from '@tak-ps/vue-tabler';
import {
    IconCheck,
    IconX,
} from '@tabler/icons-vue';

type DataAsset = {
    name: string;
    size: number;
    sync?: boolean;
};

const route = useRoute();
const loading = ref(true);
const error = ref<Error>();
const assets = ref<DataAsset[]>([]);

onMounted(async () => {
    await fetchList();
});

async function fetchList() {
    loading.value = true;
    error.value = undefined;

    try {
        const { data, error: reqError } = await server.GET('/api/connection/{:connectionid}/data/{:dataid}/asset', {
            params: {
                path: {
                    ':connectionid': Number(route.params.connectionid),
                    ':dataid': Number(route.params.dataid),
                }
            }
        });

        if (reqError) throw new Error(reqError.message);
        assets.value = Array.isArray(data?.assets) ? data.assets : [];
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
    }

    loading.value = false;
}
</script>
