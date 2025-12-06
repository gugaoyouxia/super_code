class Solution {
public:
    int minDeletion(string s, int k) {
        int ans = 0;
        vector<int> album(26, 0);
        int n = s.length();
        for(int i = 0;i < n;i++) {
            album[s[i] - 'a']++;
        }
        // unordered_map<char, int> album_map;
        // for(int i = 0;i < s.length();i++){
        //     album_map[s[i]]++;
        // }
        sort(album.begin(), album.end());
        for(int i = 0;i < 26 - k;i++){
            ans += album[i];
        }
        return ans;
    }
};
